import { Logger } from '@botpress/logger'
import { http } from '@botpress/nlu-client'
import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'
import { ResponseError, UnauthorizedError } from './errors'

const makeUnauthorizedError = (msg: string) => {
  return new UnauthorizedError(msg)
}

export const authMiddleware = (secureToken: string, baseLogger: Logger, secondToken?: string) => (req, _res, next) => {
  if (!secureToken || !secureToken.length) {
    return next()
  }

  const logger = baseLogger.sub('api').sub('auth')

  if (!req.headers.authorization) {
    logger.error('Authorization header missing', { ip: req.ip })
    return next(makeUnauthorizedError('Authorization header is missing'))
  }

  const [scheme, token] = req.headers.authorization.split(' ')
  if (scheme.toLowerCase() !== 'bearer') {
    logger.error('Schema is missing', { ip: req.ip })
    return next(makeUnauthorizedError(`Unknown scheme "${scheme}" - expected 'bearer <token>'`))
  }

  if (!token) {
    logger.error('Token is missing', { ip: req.ip })
    return next(makeUnauthorizedError('Authentication token is missing'))
  }

  if (secureToken !== token && secondToken !== token) {
    logger.error('Invalid token', { ip: req.ip })
    return next(makeUnauthorizedError('Invalid Bearer token'))
  }

  next()
}

export const handleError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const httpStatusCode = err instanceof ResponseError ? err.statusCode : 500
  const resp: http.ErrorResponse = { success: false, error: err.message }
  return res.status(httpStatusCode).send(resp)
}
