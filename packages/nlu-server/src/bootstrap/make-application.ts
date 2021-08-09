import { Logger } from '@botpress/logger'
import chokidar from 'chokidar'
import knex from 'knex'
import { nanoid } from 'nanoid'
import PGPubsub from 'pg-pubsub'
import { Application } from '../application'
import { DistributedApp } from '../application/distributed'
import TrainingQueue from '../application/training-queue'
import { makeGhost } from '../infrastructure/make-ghost'
import { ModelRepoOptions, ModelRepository } from '../infrastructure/model-repo'
import { TrainingSetRepository } from '../infrastructure/train-set-repo'
import { DbTrainingRepository } from '../infrastructure/training-repo/db-training-repo'
import InMemoryTrainingRepo from '../infrastructure/training-repo/in-memory-training-repo'
import { DBBroadcaster, InMemoryBroadcaster } from '../utils/broadcast'
import { NLUServerOptions } from './config'
import { makeEngine } from './make-engine'

const CLUSTER_ID = nanoid()

const makeKnexDb = (dbURL: string) => {
  return knex({
    connection: dbURL,
    client: 'pg'
  })
}

const makeBroadcaster = (dbURL: string) => {
  const dummyLogger = () => {}
  const pubsub = new PGPubsub(dbURL, {
    log: dummyLogger
  })
  return new DBBroadcaster(pubsub)
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

  const ghost = makeGhost(baseLogger, modelDir!, watcher, databaseURL)
  await ghost.initialize(!!databaseURL)
  const modelRepo = new ModelRepository(ghost, baseLogger, modelRepoOptions)
  const trainSetRepo = new TrainingSetRepository(ghost, baseLogger)

  const trainSessionService = databaseURL
    ? new DbTrainingRepository(makeKnexDb(databaseURL), baseLogger, CLUSTER_ID)
    : new InMemoryTrainingRepo(baseLogger)

  const trainService = new TrainingQueue(baseLogger, engine, modelRepo, trainSessionService, trainSetRepo, CLUSTER_ID)

  const broadcaster = databaseURL ? makeBroadcaster(databaseURL) : new InMemoryBroadcaster()
  const application = new DistributedApp(
    modelRepo,
    trainSessionService,
    trainService,
    engine,
    serverVersion,
    baseLogger,
    broadcaster
  )
  await application.initialize()

  return application
}
