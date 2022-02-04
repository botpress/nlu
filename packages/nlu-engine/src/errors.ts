import { LangError as SerializedError, ErrorType as LangServerErrorType } from '@botpress/lang-client'

export class TrainingCanceled extends Error {}
export function isTrainingCanceled(err: Error): err is TrainingCanceled {
  return err instanceof TrainingCanceled
}

export class TrainingAlreadyStarted extends Error {}
export function isTrainingAlreadyStarted(err: Error): err is TrainingAlreadyStarted {
  return err instanceof TrainingAlreadyStarted
}

export class TrainingExitedUnexpectedly extends Error {
  constructor(srcWorkerId: number, info: { exitCode: number; signal: string }) {
    const { exitCode, signal } = info
    super(`Training worker ${srcWorkerId} exited with exit code ${exitCode} and signal ${signal}.`)
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
export function isLangServerError(err: Error): err is LangServerError {
  return err instanceof LangServerError
}

export class DucklingServerError extends Error {
  constructor(message: string, stack?: string) {
    super(message)
    this.stack = stack
  }
}
export function isDucklingServerError(err: DucklingServerError): err is DucklingServerError {
  return err instanceof DucklingServerError
}
