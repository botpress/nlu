import { ChildProcess, fork } from 'child_process'
import _ from 'lodash'
import path from 'path'

import { deserializeError } from '../error-utils'
import { TaskAlreadyStartedError, TaskCanceledError, TaskExitedUnexpectedlyError } from '../errors'
import { FullLogger } from '../typings'

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

const SIG_KILL = 'SIGKILL'

interface Options {
  entryPoint: string
  env: _.Dictionary<string>
}

export class ProcessPool<I = {}, O = {}> {
  private readyWorkers: ChildProcess[] = []
  private activeWorkers: { [taskId: string]: ChildProcess } = {}

  constructor(private logger: FullLogger, private config: Options) {}

  public async cancel(taskId: string): Promise<void> {
    const worker = this.activeWorkers[taskId]
    if (!worker) {
      return
    }

    worker.kill(SIG_KILL)

    delete this.activeWorkers[taskId]
    this.readyWorkers = this.readyWorkers.filter((w) => w.pid !== worker.pid) // just in case...
  }

  public async run(taskId: string, input: I, progress: (x: number) => void): Promise<O> {
    if (!!this.activeWorkers[taskId]) {
      throw new TaskAlreadyStartedError(`Task ${taskId} already started`)
    }

    if (!this.readyWorkers.length) {
      const newWorker = await this._createNewWorker()
      this.readyWorkers.push(newWorker)
    }

    const worker = this.readyWorkers.pop()!
    this.activeWorkers[taskId] = worker

    let output: O
    try {
      output = await this._startTask(worker, input, progress)
    } catch (err) {
      const isTrainingDead = err instanceof TaskCanceledError || err instanceof TaskExitedUnexpectedlyError
      if (isTrainingDead) {
        delete this.activeWorkers[taskId]
      } else {
        this._prepareForNextTraining(taskId)
      }
      throw err
    }
    this._prepareForNextTraining(taskId)
    return output
  }

  private _prepareForNextTraining(trainSessionId: string) {
    const worker = this.activeWorkers[trainSessionId]
    this.readyWorkers.unshift(worker)
    delete this.activeWorkers[trainSessionId]
  }

  private async _startTask(worker: ChildProcess, input: I, progress: (x: number) => void): Promise<O> {
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
        reject(new TaskExitedUnexpectedlyError(worker.pid, { exitCode, signal }))
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

  private async _createNewWorker(): Promise<ChildProcess> {
    const worker = fork(this.config.entryPoint, [], {
      env: { ...this.config.env }
    })

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
        reject(new TaskExitedUnexpectedlyError(worker.pid, { exitCode, signal }))
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
