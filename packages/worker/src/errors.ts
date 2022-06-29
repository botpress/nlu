import { errors } from './typings'

export class TaskCanceledError extends Error implements errors.TaskCanceledError {}

export class TaskAlreadyStartedError extends Error implements errors.TaskAlreadyStartedError {}

export class TaskExitedUnexpectedlyError extends Error implements errors.TaskExitedUnexpectedlyError {
  public wid: number | undefined
  public exitCode: number
  public signal: string

  constructor(args: errors.TaskExitedUnexpectedlyErrorArgs) {
    const { wType, wid, exitCode, signal } = args
    const workerType = wType === 'process' ? 'Process' : 'Thread'
    const message = `${workerType} ${wid} exited with exit code ${exitCode} and signal ${signal}.`
    super(message)
    this.wid = args.wid
    this.exitCode = exitCode
    this.signal = signal
  }
}
