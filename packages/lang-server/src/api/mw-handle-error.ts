import { LangError, ErrorResponse } from '@botpress/lang-client'
import { NextFunction, Request, Response } from 'express'
import { BadRequestError, NotReadyError, UnauthorizedError, OfflineError, ResponseError } from './errors'

const serializeError = (err: Error): LangError => {
  const { message, stack } = err
  if (err instanceof BadRequestError) {
    const { statusCode } = err
    return { message, stack, type: 'bad_request', code: statusCode }
  }
  if (err instanceof NotReadyError) {
    const { statusCode } = err
    return { message, stack, type: 'not_ready', code: statusCode }
  }
  if (err instanceof UnauthorizedError) {
    const { statusCode } = err
    return { message, stack, type: 'unauthorized', code: statusCode }
  }
  if (err instanceof OfflineError) {
    const { statusCode } = err
    return { message, stack, type: 'offline', code: statusCode }
  }
  if (err instanceof ResponseError) {
    const { statusCode } = err
    return { message, stack, type: 'unknown', code: statusCode }
  }
  return { message, stack, type: 'unknown', code: 500 }
}

export const handleUnexpectedError = (thrownObject: any, _req: Request, res: Response, _next: NextFunction) => {
  const err: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)
  const langError = serializeError(err)
  const { code } = langError
  const response: ErrorResponse = {
    success: false,
    error: langError
  }
  res.status(code).json(response)
}
