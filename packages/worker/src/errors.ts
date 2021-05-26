import { Worker } from './worker-pool/worker'

export class TaskCanceledError extends Error {}
export function isTaskCanceled(err: Error): err is TaskCanceledError {
  return err instanceof TaskCanceledError
}

export class TaskAlreadyStartedError extends Error {}
export function isTaskAlreadyStarted(err: Error): err is TaskAlreadyStartedError {
  return err instanceof TaskAlreadyStartedError
}

export class TaskExitedUnexpectedlyError extends Error {
  public wid: number
  public info: { exitCode: number; signal: string }

  constructor(worker: Worker, info: { exitCode: number; signal: string }) {
    const { exitCode, signal } = info
    const { type } = worker.innerWorker
    const workerType = type === 'process' ? 'Process' : 'Thread'
    const message = `${workerType} ${worker.wid} exited with exit code ${exitCode} and signal ${signal}.`
    super(message)
    ;(this.wid = worker.wid), (this.info = info)
  }
}
export function isTaskExitedUnexpectedly(err: Error): err is TaskExitedUnexpectedlyError {
  return err instanceof TaskExitedUnexpectedlyError
}
