import _ from 'lodash'

import { ErrorHandler } from '../error-handler'
import { TaskAlreadyStartedError, TaskCanceledError, TaskExitedUnexpectedlyError } from '../errors'
import { SIG_KILL } from '../signals'
import { Logger, PoolOptions, WorkerPool as IWorkerPool, ErrorDeserializer, errors, TaskProgress } from '../typings'

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

export abstract class WorkerPool<I, O, P = void> implements IWorkerPool<I, O, P> {
  protected _scheduler: Scheduler

  private errorHandler: ErrorDeserializer

  constructor(protected logger: Logger, private config: PoolOptions) {
    this.errorHandler = config.errorHandler ?? new ErrorHandler()
    this._scheduler = new Scheduler(() => this._createNewWorker(), this.logger, { maxItems: this.config.maxWorkers })
  }

  abstract createWorker: (entryPoint: string, env: NodeJS.ProcessEnv) => Promise<Worker>
  abstract isMainWorker: () => boolean

  public async run(taskId: string, input: I, progress: TaskProgress<I, O, P>): Promise<O> {
    if (!this.isMainWorker()) {
      throw new Error("Can't create a worker pool inside a child worker.")
    }

    if (this._scheduler.isActive(taskId)) {
      throw new TaskAlreadyStartedError(`Task ${taskId} already started`)
    }

    const worker = await this._scheduler.getNext(taskId)

    let output: O
    try {
      this.logger.debug(`About to start task on worker ${worker.wid}`)
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

  public cancel(id: string) {
    return this._scheduler.cancel(id)
  }

  private async _startTask(worker: Worker, input: I, progress: TaskProgress<I, O, P>): Promise<O> {
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

      const messageHandler = (msg: AllIncomingMessages<O, P>) => {
        if (isTrainingDone(msg)) {
          removeHandlers()
          resolve(msg.payload.output)
        }
        if (isTrainingError(msg)) {
          removeHandlers()

          const deserializedError = this.errorHandler.deserializeError(msg.payload.error)
          reject(deserializedError)
        }
        if (isTrainingProgress(msg)) {
          progress(msg.payload.progress, msg.payload.data)
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
        reject(this._taskExitedUnexpectedlyError(worker, exitCode, signal))
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

      const messageHandler = (msg: AllIncomingMessages<O, P>) => {
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
        reject(this._taskExitedUnexpectedlyError(worker, exitCode, signal))
      }

      addHandlers()
    })
  }

  private _taskExitedUnexpectedlyError(worker: Worker, exitCode: number, signal: string): TaskExitedUnexpectedlyError {
    return new TaskExitedUnexpectedlyError({ wType: worker.innerWorker.type, wid: worker.wid, exitCode, signal })
  }

  private _logMessage(msg: IncomingMessage<'log', O, P>) {
    const { log } = msg.payload
    log.debug && this.logger.debug(log.debug)
    log.info && this.logger.info(log.info)
    log.warning && this.logger.warning(log.warning)
    log.error && this.logger.error(log.error)
  }
}
