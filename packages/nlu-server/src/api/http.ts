import { http } from '@botpress/nlu-client'
import { NLUError } from '@botpress/nlu-client/src/typings/http'
import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'

import {
  ModelDoesNotExistError,
  TrainingNotFoundError,
  TrainingAlreadyStartedError,
  LangServerCommError,
  DucklingCommError,
  DatasetValidationError
} from '../application/errors'
import { InvalidRequestFormatError } from './errors'

const serializeError = (err: Error): NLUError => {
  const { message, stack } = err
  if (err instanceof ModelDoesNotExistError) {
    const { statusCode } = err
    return { message, stack, type: 'model_not_found', code: statusCode }
  }
  if (err instanceof TrainingNotFoundError) {
    const { statusCode } = err
    return { message, stack, type: 'training_not_found', code: statusCode }
  }
  if (err instanceof TrainingAlreadyStartedError) {
    const { statusCode } = err
    return { message, stack, type: 'training_already_started', code: statusCode }
  }
  if (err instanceof InvalidRequestFormatError) {
    const { statusCode } = err
    return { message, stack, type: 'request_format', code: statusCode }
  }
  if (err instanceof LangServerCommError) {
    const { statusCode } = err
    return { message, stack, type: 'lang-server', code: statusCode }
  }
  if (err instanceof DucklingCommError) {
    const { statusCode } = err
    return { message, stack, type: 'duckling-server', code: statusCode }
  }
  if (err instanceof DatasetValidationError) {
    const { statusCode } = err
    return { message, stack, type: 'dataset_format', code: statusCode }
  }
  return { message, stack, type: 'internal', code: 500 }
}

export const handleError = (thrownObject: any, _req: Request, res: Response, _next: NextFunction) => {
  const error: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)
  const nluError = serializeError(error)
  const { code } = nluError
  const resp: http.ErrorResponse = { success: false, error: nluError }
  return res.status(code).send(resp)
}

const X_APP_ID = 'X-App-Id'.toLowerCase()
export const getAppId = (req: Request): string => {
  const appId = req.headers[X_APP_ID]
  if (!_.isString(appId) || !appId.length) {
    throw new InvalidRequestFormatError('X-App-Id Header must be a non-empty string.')
  }
  return appId
}
