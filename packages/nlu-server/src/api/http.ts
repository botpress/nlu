import { http } from '@botpress/nlu-client'
import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'
import { InvalidRequestFormatError, ResponseError } from './errors'

export const handleError = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const httpStatusCode = err instanceof ResponseError ? err.statusCode : 500
  const resp: http.ErrorResponse = { success: false, error: err.message }
  return res.status(httpStatusCode).send(resp)
}

const X_APP_ID = 'X-App-Id'.toLowerCase()
export const getAppId = (req: Request): string => {
  const appId = req.headers[X_APP_ID]
  if (!_.isString(appId) || !appId.length) {
    throw new InvalidRequestFormatError('X-App-Id Header must be a non-empty string.')
  }
  return appId
}
