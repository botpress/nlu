import { Logger } from '@botpress/logger'
import { NextFunction, Response, Request } from 'express'
import { UnauthorizedError } from './errors'

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
    return next(new UnauthorizedError('Authorization header is missing'))
  }

  const [scheme, token] = req.headers.authorization.split(' ')
  if (scheme.toLowerCase() !== 'bearer') {
    logger.error('Schema is missing', { ip: req.ip })
    return next(new UnauthorizedError(`Unknown scheme "${scheme}" - expected 'bearer <token>'`))
  }

  if (!token) {
    logger.error('Token is missing', { ip: req.ip })
    return next(new UnauthorizedError('Authentication token is missing'))
  }

  if (secureToken !== token && secondToken !== token) {
    logger.error('Invalid token', { ip: req.ip })
    return next(new UnauthorizedError('Invalid Bearer token'))
  }

  next()
}
