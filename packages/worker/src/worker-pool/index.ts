import _ from 'lodash'

import { deserializeError } from '../error-utils'
import { TaskAlreadyStartedError, TaskCanceledError, TaskExitedUnexpectedlyError } from '../errors'
import { SIG_KILL } from '../signals'
import { FullLogger, WorkerPool as IWorkerPool } from '../typings'

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
import { Scheduler } from './scheduler'
import { Worker } from './worker'

export interface Options {
  entryPoint: string
  maxWorkers: number
  env: _.Dictionary<string>
}

export abstract class WorkerPool<I, O> implements IWorkerPool<I, O> {
  protected _scheduler = new Scheduler(() => this._createNewWorker(), { maxItems: -1 })

  constructor(private logger: FullLogger, private config: Options) {}

  abstract createWorker: (entryPoint: string, env: _.Dictionary<string>) => Promise<Worker>
  abstract isMainWorker: () => boolean

  public async run(taskId: string, input: I, progress: (x: number) => void): Promise<O> {
    if (!this.isMainWorker()) {
      throw new Error("Can't create a worker pool inside a child worker.")
    }

    if (this._scheduler.isActive(taskId)) {
      throw new TaskAlreadyStartedError(`Task ${taskId} already started`)
    }

    const worker = await this._scheduler.getNext(taskId)

    let output: O
    try {
      output = await this._startTask(worker, input, progress)
    } catch (err) {
      const isTrainingDead = err instanceof TaskCanceledError || err instanceof TaskExitedUnexpectedlyError
      if (!isTrainingDead) {
        this._scheduler.releaseItem(taskId, worker)
      }
      throw err
    }
    this._scheduler.releaseItem(taskId, worker)
    return output
  }

  private async _startTask(worker: Worker, input: I, progress: (x: number) => void): Promise<O> {
    const msg: OutgoingMessage<'start_task', I> = {
      type: 'start_task',
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

      const messageHandler = (msg: AllIncomingMessages<O>) => {
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
          reject(new TaskCanceledError())
          return
        }
        reject(new TaskExitedUnexpectedlyError(worker.wid, { exitCode, signal }))
        return
      }

      const errorHandler = (err: Error) => {
        removeHandlers()
        reject(err)
      }

      addHandlers()
      worker.message(msg)
    })
  }

  private async _createNewWorker(): Promise<Worker> {
    const worker = await this.createWorker(this.config.entryPoint, { ...this.config.env })

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

      const messageHandler = (msg: AllIncomingMessages<O>) => {
        if (isLog(msg)) {
          this._logMessage(msg)
        }

        if (isWorkerReady(msg)) {
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
        reject(new TaskExitedUnexpectedlyError(worker.wid, { exitCode, signal }))
      }

      addHandlers()
    })
  }

  private _logMessage(msg: IncomingMessage<'log', O>) {
    const { log } = msg.payload
    log.debug && this.logger.debug(log.debug)
    log.info && this.logger.info(log.info)
    log.warning && this.logger.warn(log.warning)
    log.error && this.logger.error(log.error)
  }
}
