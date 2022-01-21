import { LangError as SerializedError, ErrorType as LangServerErrorType } from '@botpress/lang-client'

export class TrainingCanceledError extends Error {}
export class TrainingAlreadyStartedError extends Error {}
export class TrainingExitedUnexpectedlyError extends Error {
  constructor(srcWorkerId: number, info: { exitCode: number; signal: string }) {
    const { exitCode, signal } = info
    super(`Training worker ${srcWorkerId} exited with exit code ${exitCode} and signal ${signal}.`)
  }
}

export class LintingCanceledError extends Error {}
export class LintingAlreadyStartedError extends Error {}
export class LintingExitedUnexpectedlyError extends Error {
  constructor(srcWorkerId: number, info: { exitCode: number; signal: string }) {
    const { exitCode, signal } = info
    super(`Linting worker ${srcWorkerId} exited with exit code ${exitCode} and signal ${signal}.`)
  }
}

export class ModelLoadingError extends Error {
  constructor(component: string, innerError: Error | undefined) {
    super(`${component} could not load model. Inner error is: "${innerError?.message}"`)
  }
}

export class LangServerError extends Error {
  public code: number
  public type: LangServerErrorType

  constructor(serializedError: SerializedError) {
    super(serializedError.message)
    const { code, type, stack } = serializedError
    this.stack = stack
    this.code = code
    this.type = type
  }
}

export class DucklingServerError extends Error {
  constructor(message: string, stack?: string) {
    super(message)
    this.stack = stack
  }
}
