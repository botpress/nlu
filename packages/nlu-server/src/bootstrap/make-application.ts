import { Logger } from '@botpress/logger'
import chokidar from 'chokidar'
import knex from 'knex'
import { Application } from '../application'
import TrainingQueue from '../application/training-queue'
import { ModelRepoOptions, ModelRepository } from '../infrastructure/model-repo'
import { DbTrainingRepository } from '../infrastructure/training-repo/db-training-repo'
import InMemoryTrainingRepo from '../infrastructure/training-repo/in-memory-training-repo'
import { NLUServerOptions } from './config'
import { makeEngine } from './make-engine'

const makeKnexDb = (dbURL: string) => {
  return knex({
    connection: dbURL,
    client: 'pg'
  })
}

export const makeApplication = async (
  options: NLUServerOptions,
  serverVersion: string,
  baseLogger: Logger,
  watcher: chokidar.FSWatcher
): Promise<Application> => {
  const engine = await makeEngine(options, baseLogger.sub('Engine'))

  const { dbURL: databaseURL, modelDir } = options
  const modelRepoOptions: Partial<ModelRepoOptions> = databaseURL
    ? {
        driver: 'db',
        dbURL: databaseURL,
        modelDir
      }
    : {
        driver: 'fs',
        modelDir
      }

  const modelRepo = new ModelRepository(baseLogger, modelRepoOptions, watcher)

  const trainSessionService = databaseURL
    ? new DbTrainingRepository(makeKnexDb(databaseURL), baseLogger)
    : new InMemoryTrainingRepo(baseLogger)

  const trainService = new TrainingQueue(baseLogger, engine, modelRepo, trainSessionService)
  const application = new Application(modelRepo, trainSessionService, trainService, engine, serverVersion, baseLogger)
  await application.initialize()

  return application
}
