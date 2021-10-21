import { LanguageService } from '@botpress/nlu-engine'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { BadRequestError } from './errors'
import { RequestWithLang } from './http'

export const assertValidLanguage = (service: LanguageService) => (req: Request, _res: Response, next: NextFunction) => {
  const language = req.body.lang || req.params.lang

  if (!language) {
    return next(new BadRequestError("Param 'lang' is mandatory"))
  }

  if (!_.isString(language)) {
    return next(new BadRequestError(`Param 'lang': ${language} must be a string`))
  }

  const availableLanguages = service.getModels().map((x) => x.lang)
  if (!availableLanguages.includes(language)) {
    return next(new BadRequestError(`Param 'lang': ${language} is not element of the available languages`))
  }

  ;(req as RequestWithLang).language = language
  next()
}
