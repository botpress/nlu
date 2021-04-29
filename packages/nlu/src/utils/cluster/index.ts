import cluster, { Worker } from 'cluster'
import _ from 'lodash'
import nanoid from 'nanoid/generate'
import yn from 'yn'
import { LanguageConfig } from '../../engine'
import Logger from '../logger'
import { Logger as ILogger } from '../typings'

export enum WORKER_TYPES {
  WEB = 'WEB_WORKER',
  LOCAL_ACTION_SERVER = 'LOCAL_ACTION_SERVER',
  TRAINING = 'TRAINING'
}

const MESSAGE_TYPE_START_LOCAL_ACTION_SERVER = 'start_local_action_server'

export interface StartLocalActionServerMessage {
  appSecret: string
  port: number
}

const msgHandlers: { [messageType: string]: (message: any, worker: cluster.Worker) => void } = {}

const maxServerReebots = process.core_env.BP_MAX_SERVER_REBOOT || 2
let webServerRebootCount = 0

/**
 * The master process handles training and rebooting the server.
 * The worker process runs the actual server
 *
 * Exit code 0 or undefined: Success (kill worker & master)
 * Exit code 1: Error (will try to respawn workers)
 */
export const registerMsgHandler = (messageType: string, handler: (message: any, worker: cluster.Worker) => void) => {
  msgHandlers[messageType] = handler
}

export const setupMasterNode = (logger: ILogger) => {
  process.SERVER_ID = process.env.SERVER_ID || nanoid('1234567890abcdefghijklmnopqrstuvwxyz', 10)

  // Fix an issue with pkg when passing custom options for v8
  cluster.setupMaster({ execArgv: process.pkg ? [] : process.execArgv })

  registerMsgHandler('reboot_server', (_message, worker) => {
    logger.warn('Restarting server...')
    worker.disconnect()
    worker.kill()
  })

  registerMsgHandler(MESSAGE_TYPE_START_LOCAL_ACTION_SERVER, (message: StartLocalActionServerMessage) => {
    const { appSecret, port } = message
    cluster.fork({ WORKER_TYPE: WORKER_TYPES.LOCAL_ACTION_SERVER, APP_SECRET: appSecret, PORT: port })
  })

  cluster.on('exit', async (worker: Worker, code: number, signal: string) => {
    const { exitedAfterDisconnect, id } = worker

    if (process.TRAINING_WORKERS?.includes(id)) {
      process.TRAINING_WORKERS = process.TRAINING_WORKERS.filter((w) => w !== id)
      return
    }

    // TODO: the debug instance has no access to the debug config. It is in the web process.
    logger.debug('Process exiting %o', { workerId: id, code, signal, exitedAfterDisconnect })
    // Reset the counter when the reboot was intended
    if (exitedAfterDisconnect) {
      webServerRebootCount = 0
      // Clean exit
    } else if (code === 0) {
      process.exit(0)
    }

    if (!yn(process.core_env.BP_DISABLE_AUTO_RESTART)) {
      if (webServerRebootCount >= maxServerReebots) {
        logger.error(
          `Exceeded the maximum number of automatic server reboot (${maxServerReebots}). Set the "BP_MAX_SERVER_REBOOT" environment variable to change that`
        )
        process.exit(0)
      }
      spawnWebWorker()
      webServerRebootCount++
    }
  })

  cluster.on('message', (worker: cluster.Worker, message: any) => {
    if (message.compile) {
      // ignore ts-node-dev worker messages
      return
    }
    const handler = msgHandlers[message.type]
    if (!handler) {
      return logger.error(`No handler configured for ${message.type}`)
    }

    try {
      handler(message, worker)
    } catch (err) {
      logger.attachError(err).error(`Error while processing worker message ${message.type}`)
    }
  })

  spawnWebWorker()
}

function spawnWebWorker() {
  const { id } = cluster.fork({
    SERVER_ID: process.SERVER_ID,
    WORKER_TYPE: WORKER_TYPES.WEB,
    VERBOSITY_LEVEL: process.VERBOSITY_LEVEL
  })
  process.WEB_WORKER = id
  Logger.sub('cluster').debug('Spawned Web Worker')
}

export async function spawnNewTrainingWorker(config: LanguageConfig, requestId: string): Promise<number> {
  if (!process.TRAINING_WORKERS) {
    process.TRAINING_WORKERS = []
  }
  const worker = cluster.fork({
    WORKER_TYPE: WORKER_TYPES.TRAINING,
    VERBOSITY_LEVEL: process.VERBOSITY_LEVEL,
    NLU_CONFIG: JSON.stringify(config),
    REQUEST_ID: requestId,
    BP_FAILSAFE: false // training workers are allowed to fail and exit
  })
  const workerId = worker.id
  process.TRAINING_WORKERS.push(workerId)
  return new Promise((resolve) => worker.on('online', () => resolve(workerId)))
}

export const startLocalActionServer = (message: StartLocalActionServerMessage) => {
  process.send!({ type: MESSAGE_TYPE_START_LOCAL_ACTION_SERVER, ...message })
}
