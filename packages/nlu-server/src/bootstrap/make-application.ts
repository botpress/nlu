import { makePostgresTrxQueue } from '@botpress/locks'
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
import { InMemoryLintingRepo } from '../infrastructure/linting-repo'
import { NLUServerOptions } from '../typings'
import { Broadcaster } from '../utils/broadcast'
import { makeEngine } from './make-engine'

type Services = {
  modelRepo: ModelRepository
  trainRepo: TrainingRepository
  trainingQueue: TrainingQueue
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
  return {
    modelRepo,
    trainRepo,
    trainingQueue
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
  const trainRepo = new DbTrainingRepository(knexDb, makePostgresTrxQueue(dbURL, loggingCb), logger, CLUSTER_ID)
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
  return {
    modelRepo,
    trainRepo,
    trainingQueue
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
  const { modelRepo, trainRepo, trainingQueue } = await serviceMaker(engine, baseLogger, options)

  const inMemoryLintingRepo = new InMemoryLintingRepo(baseLogger, engine)
  const application = new Application(
    modelRepo,
    trainRepo,
    inMemoryLintingRepo,
    trainingQueue,
    engine,
    serverVersion,
    baseLogger
  )
  await application.initialize()
  return application
}
