import { LanguageService } from '@botpress/nlu-engine'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { LANGUAGES } from '../../languages'
import { BadRequestError } from './../errors'

export type RequestWithLang = Request & {
  params: { lang: string }
}

export const assertLanguage = (service: LanguageService, language: any): void => {
  if (!language) {
    throw new BadRequestError("Param 'lang' is mandatory")
  }

  if (!_.isString(language)) {
    throw new BadRequestError(`Param 'lang': ${language} must be a string`)
  }

  if (!_(LANGUAGES).keys().includes(language)) {
    throw new BadRequestError(`Param 'lang': ${language} is not an iso 639-1 language code`)
  }

  const availableLanguages = service.getModels().map((x) => x.lang)
  if (!availableLanguages.includes(language)) {
    throw new BadRequestError(`Param 'lang': ${language} is not element of the available languages`)
  }

  // language is valid
}

export const extractPathLanguageMiddleware = (service: LanguageService) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assertLanguage(service, req.params.lang)
      next()
    } catch (err) {
      next(err)
    }
  }
}
