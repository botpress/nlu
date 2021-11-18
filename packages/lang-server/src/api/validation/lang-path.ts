import { LanguageService } from '@botpress/nlu-engine'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { BadRequestError } from './../errors'

export type RequestWithLang = Request & {
  language?: string
}

export const validateLanguage = (service: LanguageService) => (language: any): string => {
  if (!language) {
    throw new BadRequestError("Param 'lang' is mandatory")
  }

  if (!_.isString(language)) {
    throw new BadRequestError(`Param 'lang': ${language} must be a string`)
  }

  const availableLanguages = service.getModels().map((x) => x.lang)
  if (!availableLanguages.includes(language)) {
    throw new BadRequestError(`Param 'lang': ${language} is not element of the available languages`)
  }

  return language
}

export const extractPathLanguageMiddleware = (service: LanguageService) => {
  const languageValidator = validateLanguage(service)

  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const language = languageValidator(req.params.lang)
      ;(req as RequestWithLang).language = language
      next()
    } catch (err) {
      next(err)
    }
  }
}
