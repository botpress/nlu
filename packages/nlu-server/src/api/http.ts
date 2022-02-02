import { http } from '@botpress/nlu-client'
import { NLUError } from '@botpress/nlu-client/src/typings/http'
import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'

import {
  ModelDoesNotExistError,
  TrainingNotFoundError,
  TrainingAlreadyStartedError,
  LangServerCommError,
  DucklingCommError
} from '../application/errors'
import { InvalidRequestFormatError, InvalidTrainSetError } from './errors'
import { validateAppId } from './validation'

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
  if (err instanceof InvalidTrainSetError) {
    const { statusCode } = err
    return { message, stack, type: 'invalid_train_set', code: statusCode }
  }
  if (err instanceof LangServerCommError) {
    const { statusCode } = err
    return { message, stack, type: 'lang-server', code: statusCode }
  }
  if (err instanceof DucklingCommError) {
    const { statusCode } = err
    return { message, stack, type: 'duckling-server', code: statusCode }
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

const X_APP_ID = 'X-App-Id'
const x_app_id = X_APP_ID.toLowerCase()
export const getAppId = (req: Request): string => {
  const appId = req.headers[x_app_id]
  if (!_.isString(appId) || !appId.length) {
    throw new InvalidRequestFormatError(`${X_APP_ID} Header must be a non-empty string.`)
  }
  return validateAppId(appId)
}
