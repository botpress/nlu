import { locks } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { Engine } from '@botpress/nlu-engine'
import Knex from 'knex'
import { nanoid } from 'nanoid'
import PGPubsub from 'pg-pubsub'
import { Application } from '../application'
import { DistributedTrainingQueue } from '../application/distributed-training-queue'
import TrainingQueue, { QueueOptions } from '../application/training-queue'
import {
  DbTrainingRepository,
  InMemoryTrainingRepo,
  TrainingRepository,
  FileSystemModelRepository,
  DbModelRepository,
  ModelRepository
} from '../infrastructure'
import { InMemoryLintingRepo, LintingRepository, DatabaseLintingRepo } from '../infrastructure/linting-repo'
import { NLUServerOptions } from '../typings'
import { Broadcaster } from '../utils/broadcast'
import { makeEngine } from './make-engine'

type Services = {
  modelRepo: ModelRepository
  trainRepo: TrainingRepository
  trainingQueue: TrainingQueue
  lintingRepo: LintingRepository
}

const CLUSTER_ID = nanoid()

const makeBroadcaster = (dbURL: string) => {
  const dummyLogger = () => {}
  const pubsub = new PGPubsub(dbURL, {
    log: dummyLogger
  })
  return new Broadcaster(pubsub)
}

const makeServicesWithoutDb = (modelDir: string) => async (
  engine: Engine,
  logger: Logger,
  queueOptions?: Partial<QueueOptions>
): Promise<Services> => {
  const modelRepo = new FileSystemModelRepository(modelDir, logger)
  const trainRepo = new InMemoryTrainingRepo(logger)
  const trainingQueue = new TrainingQueue(engine, modelRepo, trainRepo, CLUSTER_ID, logger, queueOptions)
  const lintingRepo = new InMemoryLintingRepo(logger)
  return {
    modelRepo,
    trainRepo,
    trainingQueue,
    lintingRepo
  }
}

const makeServicesWithDb = (dbURL: string) => async (
  engine: Engine,
  logger: Logger,
  queueOptions?: Partial<QueueOptions>
): Promise<Services> => {
  const knexDb = Knex({ connection: dbURL, client: 'pg' })

  const modelRepo = new DbModelRepository(knexDb, logger)
  const loggingCb = (msg: string) => logger.sub('trx-queue').debug(msg)

  const pgLocker = new locks.PGTransactionLocker<void>(dbURL, loggingCb)
  const trainRepo = new DbTrainingRepository(knexDb, pgLocker, logger, CLUSTER_ID)
  const broadcaster = makeBroadcaster(dbURL)
  const trainingQueue = new DistributedTrainingQueue(
    engine,
    modelRepo,
    trainRepo,
    CLUSTER_ID,
    logger,
    broadcaster,
    queueOptions
  )
  const lintingRepo = new DatabaseLintingRepo(knexDb, logger, engine)
  return {
    modelRepo,
    trainRepo,
    trainingQueue,
    lintingRepo
  }
}

export const makeApplication = async (
  options: NLUServerOptions,
  serverVersion: string,
  baseLogger: Logger
): Promise<Application> => {
  const engine = await makeEngine(options, baseLogger.sub('Engine'))
  const { dbURL, modelDir } = options
  const serviceMaker = dbURL ? makeServicesWithDb(dbURL) : makeServicesWithoutDb(modelDir)
  const { modelRepo, trainRepo, trainingQueue, lintingRepo } = await serviceMaker(engine, baseLogger, options)

  const application = new Application(
    modelRepo,
    trainRepo,
    lintingRepo,
    trainingQueue,
    engine,
    serverVersion,
    baseLogger
  )
  await application.initialize()
  return application
}
