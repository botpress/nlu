import { LangError as SerializedError, ErrorType as LangServerErrorType } from '@botpress/lang-client'

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
