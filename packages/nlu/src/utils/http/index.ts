import { Request } from 'express'
import _ from 'lodash'
import Logger from '../logger'
import { UnauthorizedError } from './errors'

const logger = Logger.sub('api').sub('auth')

// This method is only used for basic escaping of error messages, do not use for page display
export const escapeHtmlSimple = (str: string) => {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
}

export const isAdminToken = (req, adminToken: string) => {
  if (!adminToken || !adminToken.length) {
    return true
  }
  if (!req.headers.authorization) {
    return false
  }
  const [, token] = req.headers.authorization.split(' ')
  return token === adminToken
}

const makeUnauthorizedError = (msg: string) => {
  const err = new UnauthorizedError(msg)
  err.skipLogging = true
  return err
}

export const authMiddleware = (secureToken: string, secondToken?: string) => (req, _res, next) => {
  if (!secureToken || !secureToken.length) {
    return next()
  }

  if (!req.headers.authorization) {
    logger.error('Authorization header missing', { ip: req.ip })
    return next(makeUnauthorizedError('Authorization header is missing'))
  }

  const [scheme, token] = req.headers.authorization.split(' ')
  if (scheme.toLowerCase() !== 'bearer') {
    logger.debug('Schema is missing', { ip: req.ip })
    return next(makeUnauthorizedError(`Unknown scheme "${scheme}" - expected 'bearer <token>'`))
  }

  if (!token) {
    logger.debug('Token is missing', { ip: req.ip })
    return next(makeUnauthorizedError('Authentication token is missing'))
  }

  if (secureToken !== token && secondToken !== token) {
    logger.debug('Invalid token', { ip: req.ip })
    return next(makeUnauthorizedError('Invalid Bearer token'))
  }

  next()
}

export const disabledReadonlyMiddleware = (readonly: boolean) => (_req, _res, next) => {
  if (readonly) {
    return next(new UnauthorizedError('API server is running in read-only mode'))
  }

  next()
}

export const handleUnexpectedError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const errorCode = err.errorCode || 'BP_000'
  const message = (err.errorCode && err.message) || 'Unexpected error'

  res.status(statusCode).json({
    statusCode,
    errorCode,
    type: err.type || Object.getPrototypeOf(err).name || 'Exception',
    message
  })
}

export const handleErrorLogging = (err, req, res, next) => {
  if (err && (err.skipLogging || process.env.SKIP_LOGGING)) {
    return res.status(err.statusCode).send(err.message)
  }

  next(err)
}

export type RequestWithLang = Request & {
  language?: string
}
