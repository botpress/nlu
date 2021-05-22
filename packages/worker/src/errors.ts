export class TaskCanceledError extends Error {}
export function isTaskCanceled(err: Error): err is TaskCanceledError {
  return err instanceof TaskCanceledError
}

export class TaskAlreadyStartedError extends Error {}
export function isTaskAlreadyStarted(err: Error): err is TaskAlreadyStartedError {
  return err instanceof TaskAlreadyStartedError
}

export class TaskExitedUnexpectedlyError extends Error {
  public pid: number
  public info: { exitCode: number; signal: string }

  constructor(pid: number, info: { exitCode: number; signal: string }) {
    const { exitCode, signal } = info
    super(`Process ${pid} exited with exit code ${exitCode} and signal ${signal}.`)

    ;(this.pid = pid), (this.info = info)
  }
}
export function isTaskExitedUnexpectedlyError(err: Error): err is TaskExitedUnexpectedlyError {
  return err instanceof TaskExitedUnexpectedlyError
}
