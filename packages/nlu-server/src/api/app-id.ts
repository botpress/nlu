import { Request } from 'express'
import _ from 'lodash'
import { InvalidRequestFormatError } from './errors'

const X_APP_ID = 'X-App-Id'.toLowerCase()
export const getAppId = (req: Request): string => {
  const appId = req.headers[X_APP_ID]
  if (!_.isString(appId) || !appId.length) {
    throw new InvalidRequestFormatError('X-App-Id Header must be a non-empty string.')
  }
  return appId
}
