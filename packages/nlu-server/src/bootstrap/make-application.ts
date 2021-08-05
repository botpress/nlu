import { Logger } from '@botpress/logger'
import chokidar from 'chokidar'
import { Application } from '../application'
import TrainingQueue from '../application/training-queue'
import { ModelRepoOptions, ModelRepository } from '../infrastructure/model-repo'
import InMemoryTrainingRepo from '../infrastructure/training-repo/in-memory-training-repo'
import { NLUServerOptions } from './config'
import { makeEngine } from './make-engine'

export const makeApplication = async (
  options: NLUServerOptions,
  serverVersion: string,
  baseLogger: Logger,
  watcher: chokidar.FSWatcher
): Promise<Application> => {
  const engine = await makeEngine(options, baseLogger.sub('Launcher'))

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
  const trainSessionService = new InMemoryTrainingRepo()
  const trainService = new TrainingQueue(baseLogger, engine, modelRepo, trainSessionService)
  const application = new Application(modelRepo, trainSessionService, trainService, engine, serverVersion, baseLogger)

  return application
}
