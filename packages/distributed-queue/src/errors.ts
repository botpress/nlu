export class TaskNotFoundError extends Error {
  public readonly code = 404
  constructor(taskId: string) {
    super(`no current task for model: ${taskId}`)
  }
}

export class TaskAlreadyStartedError extends Error {
  public readonly code = 409
  constructor(taskId: string) {
    super(`Training "${taskId}" already started...`)
  }
}
