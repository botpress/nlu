import { LangError, ErrorResponse } from '@botpress/lang-client'
import { Logger } from '@botpress/logger'
import { Request, NextFunction, Response } from 'express'
import _ from 'lodash'
import { UnauthorizedError, BadRequestError, NotReadyError, ResponseError, OfflineError } from './errors'

// This method is only used for basic escaping of error messages, do not use for page display
export const escapeHtmlSimple = (str: string) => {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
}

export const isAdminToken = (req: Request, adminToken: string) => {
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

export const authMiddleware = (secureToken: string, baseLogger: Logger, secondToken?: string) => (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
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

export const disabledReadonlyMiddleware = (readonly: boolean) => (_req, _res, next) => {
  if (readonly) {
    return next(new UnauthorizedError('API server is running in read-only mode'))
  }

  next()
}

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

export type RequestWithLang = Request & {
  language?: string
}
