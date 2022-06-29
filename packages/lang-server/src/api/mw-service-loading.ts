import { LanguageService } from '@botpress/nlu-engine'
import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'
import { NotReadyError } from './errors'

export const serviceLoadingMiddleware = (service: LanguageService) => (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!service.isReady) {
    return next(new NotReadyError('Language Server is still loading'))
  }

  next()
}
