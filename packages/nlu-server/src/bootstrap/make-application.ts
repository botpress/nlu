import { Logger } from '@botpress/logger'
import { Engine } from '@botpress/nlu-engine'
import Knex from 'knex'
import { Application } from '../application'
import { TrainQueueOptions, TrainingQueue, PgTrainingQueue, LocalTrainingQueue } from '../application/training-queue'
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
import { makeEngine } from './make-engine'

type Services = {
  modelRepo: ModelRepository
  trainRepo: TrainingRepository
  trainingQueue: TrainingQueue
  lintingRepo: LintingRepository
}

const makeServicesWithoutDb = (modelDir: string) => async (
  engine: Engine,
  logger: Logger,
  queueOptions?: Partial<TrainQueueOptions>
): Promise<Services> => {
  const modelRepo = new FileSystemModelRepository(modelDir, logger)
  const trainRepo = new InMemoryTrainingRepo(logger)
  const trainingQueue = new LocalTrainingQueue(trainRepo, engine, modelRepo, logger, queueOptions)
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
  queueOptions?: Partial<TrainQueueOptions>
): Promise<Services> => {
  const knexDb = Knex({ connection: dbURL, client: 'pg' })

  const modelRepo = new DbModelRepository(knexDb, logger)
  const trainRepo = new DbTrainingRepository(knexDb, logger)
  const trainingQueue = new PgTrainingQueue(dbURL, trainRepo, engine, modelRepo, logger, queueOptions)
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
