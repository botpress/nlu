export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`no current task for model: ${taskId}`)
  }
}

export class TaskNotRunning extends Error {
  constructor(taskId: string) {
    super(`no current running or pending task for model: ${taskId}`)
  }
}

export class TaskAlreadyStartedError extends Error {
  constructor(taskId: string) {
    super(`Training "${taskId}" already started...`)
  }
}
