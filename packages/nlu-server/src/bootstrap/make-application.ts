import { makePostgresTrxQueue } from '@botpress/locks'
import { Logger } from '@botpress/logger'
import chokidar from 'chokidar'
import knex from 'knex'
import { nanoid } from 'nanoid'
import PGPubsub from 'pg-pubsub'
import { Application } from '../application'
import { DistributedTrainingQueue } from '../application/distributed-training-queue'
import TrainingQueue from '../application/training-queue'
import { makeGhost } from '../infrastructure/make-ghost'
import { ModelRepository } from '../infrastructure/model-repo'
import { DbTrainingRepository } from '../infrastructure/training-repo/db-training-repo'
import InMemoryTrainingRepo from '../infrastructure/training-repo/in-memory-training-repo'
import { Broadcaster } from '../utils/broadcast'
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
  return new Broadcaster(pubsub)
}

export const makeApplication = async (
  options: NLUServerOptions,
  serverVersion: string,
  baseLogger: Logger,
  watcher: chokidar.FSWatcher
): Promise<Application> => {
  const engine = await makeEngine(options, baseLogger.sub('Engine'))

  const { dbURL, modelDir } = options

  const ghost = makeGhost(baseLogger, modelDir!, watcher, dbURL)
  await ghost.initialize(!!dbURL)

  const modelRepo = new ModelRepository(ghost, baseLogger)

  const loggingCb = (msg: string) => baseLogger.sub('trx-queue').debug(msg)

  const trainRepo = dbURL
    ? new DbTrainingRepository(makeKnexDb(dbURL), makePostgresTrxQueue(dbURL, loggingCb), baseLogger, CLUSTER_ID)
    : new InMemoryTrainingRepo(baseLogger)

  const trainingQueue = dbURL
    ? new DistributedTrainingQueue(
        engine,
        modelRepo,
        trainRepo,
        CLUSTER_ID,
        baseLogger,
        makeBroadcaster(dbURL),
        options
      )
    : new TrainingQueue(engine, modelRepo, trainRepo, CLUSTER_ID, baseLogger)

  const application = new Application(modelRepo, trainRepo, trainingQueue, engine, serverVersion, baseLogger)
  await application.initialize()
  return application
}
