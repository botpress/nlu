import { errors } from './typings'
import { Worker } from './worker-pool/worker'

export class TaskCanceledError extends Error implements errors.TaskCanceledError {}

export class TaskAlreadyStartedError extends Error implements errors.TaskAlreadyStartedError {}

export class TaskExitedUnexpectedlyError extends Error implements errors.TaskExitedUnexpectedlyError {
  public wid: number | undefined
  public info: errors.ExitInfo

  constructor(worker: Worker, info: errors.ExitInfo) {
    const { exitCode, signal } = info
    const { type } = worker.innerWorker
    const workerType = type === 'process' ? 'Process' : 'Thread'
    const message = `${workerType} ${worker.wid} exited with exit code ${exitCode} and signal ${signal}.`
    super(message)
    this.wid = worker.wid
    this.info = info
  }
}
