import { ChildProcess, fork } from 'child_process'
import _ from 'lodash'
import path from 'path'
import { deserializeError } from '../../../utils/error-utils'
import Logger from '../../../utils/logger'

import { TrainingAlreadyStarted, TrainingCanceled, TrainingExitedUnexpectedly } from '../../errors'
import { LanguageConfig } from '../../typings'
import { TrainInput, TrainOutput } from '../training-pipeline'

import {
  AllIncomingMessages,
  IncomingMessage,
  isLog,
  isTrainingDone,
  isTrainingError,
  isTrainingProgress,
  isWorkerReady,
  OutgoingMessage
} from './communication'

const logger = Logger.sub('training')

const SIG_KILL = 'SIGKILL'

const PROCESS_ENTRY_POINT = 'process-entry-point.js'

export class TrainingProcessPool {
  private readyWorkers: ChildProcess[] = []
  private activeWorkers: { [trainSessionId: string]: ChildProcess } = {}

  constructor(private config: LanguageConfig) {}

  public async cancelTraining(trainSessionId: string): Promise<void> {
    const worker = this.activeWorkers[trainSessionId]
    if (!worker) {
      return
    }

    this._cancelTraining(worker)

    delete this.activeWorkers[trainSessionId]
    this.readyWorkers = this.readyWorkers.filter((w) => w.pid !== worker.pid) // just in case...
  }

  private _cancelTraining(worker: ChildProcess) {
    logger.debug(`About to cancel training on worker ${worker.pid}`)
    worker.kill(SIG_KILL)
  }

  public async startTraining(input: TrainInput, progress: (x: number) => void): Promise<TrainOutput> {
    const { trainId } = input
    if (!!this.activeWorkers[trainId]) {
      throw new TrainingAlreadyStarted(`Training ${trainId} already started`)
    }

    if (!this.readyWorkers.length) {
      logger.debug(`[${input.trainId}] About to make new training worker`)
      const newWorker = await this._createNewWorker(trainId)
      logger.debug(`[${input.trainId}] Creation of training worker ${newWorker.pid} done.`)
      this.readyWorkers.push(newWorker)
    }

    const worker = this.readyWorkers.pop()!
    logger.debug(`[${input.trainId}] worker ${worker.pid} picked for training.`)
    this.activeWorkers[trainId] = worker

    let output: TrainOutput
    try {
      output = await this._startTraining(worker, input, progress)
    } catch (err) {
      const isTrainingDead = err instanceof TrainingCanceled || err instanceof TrainingExitedUnexpectedly
      if (isTrainingDead) {
        delete this.activeWorkers[trainId]
      } else {
        this._prepareForNextTraining(trainId)
      }
      throw err
    }
    this._prepareForNextTraining(trainId)
    return output
  }

  private _prepareForNextTraining(trainSessionId: string) {
    const worker = this.activeWorkers[trainSessionId]
    this.readyWorkers.unshift(worker)
    delete this.activeWorkers[trainSessionId]
  }

  private async _startTraining(
    worker: ChildProcess,
    input: TrainInput,
    progress: (x: number) => void
  ): Promise<TrainOutput> {
    const msg: OutgoingMessage<'start_training'> = {
      type: 'start_training',
      payload: { input }
    }

    return new Promise((resolve, reject) => {
      const removeHandlers = () => {
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        worker.off('exit', exitHandler)
      }

      const addHandlers = () => {
        worker.on('message', messageHandler)
        worker.on('error', errorHandler)
        worker.on('exit', exitHandler)
      }

      const messageHandler = (msg: AllIncomingMessages) => {
        if (isTrainingDone(msg)) {
          removeHandlers()
          resolve(msg.payload.output)
        }
        if (isTrainingError(msg)) {
          removeHandlers()
          reject(deserializeError(msg.payload.error))
        }
        if (isTrainingProgress(msg)) {
          progress(msg.payload.progress)
        }
        if (isLog(msg)) {
          this._logMessage(msg)
        }
      }

      const exitHandler = (exitCode: number, signal: string) => {
        removeHandlers()

        if (signal === SIG_KILL) {
          reject(new TrainingCanceled())
          return
        }
        reject(new TrainingExitedUnexpectedly(worker.pid, { exitCode, signal }))
        return
      }

      const errorHandler = (err: Error) => {
        removeHandlers()
        reject(err)
      }

      addHandlers()
      worker.send(msg)
    })
  }

  private async _createNewWorker(requestId: string): Promise<ChildProcess> {
    const { config } = this

    logger.debug('About to spawn new training process.', requestId)

    const processEntryPoint = path.join(__dirname, PROCESS_ENTRY_POINT)
    const worker = fork(processEntryPoint, [], {
      env: {
        NLU_CONFIG: JSON.stringify(config),
        REQUEST_ID: requestId,
        ...process.env
      }
    })
    logger.debug('Done spawning new training process.', requestId)

    return new Promise((resolve, reject) => {
      const removeHandlers = () => {
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        worker.off('exit', exitHandler)
      }

      const addHandlers = () => {
        worker.on('message', messageHandler)
        worker.on('error', errorHandler)
        worker.on('exit', exitHandler)
      }

      const messageHandler = (msg: AllIncomingMessages) => {
        if (isLog(msg) && msg.payload.requestId === requestId) {
          this._logMessage(msg)
        }

        if (isWorkerReady(msg) && msg.payload.requestId === requestId) {
          removeHandlers()
          resolve(worker)
        }
      }

      const errorHandler = (err: Error) => {
        removeHandlers()
        reject(err)
      }

      const exitHandler = (exitCode: number, signal: string) => {
        removeHandlers()
        reject(new TrainingExitedUnexpectedly(worker.pid, { exitCode, signal }))
      }

      addHandlers()
    })
  }

  private _logMessage(msg: IncomingMessage<'log'>) {
    const { log } = msg.payload
    log.debug && logger.debug(log.debug)
    log.info && logger.info(log.info)
    log.warning && logger.warn(log.warning)
    log.error && logger.error(log.error)
  }
}
