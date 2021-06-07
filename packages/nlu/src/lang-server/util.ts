import _ from 'lodash'
import { LanguageService } from '../engine'
import { BadRequestError, NotReadyError } from '../utils/http/errors'

export const serviceLoadingMiddleware = (service: LanguageService) => (_req, _res, next) => {
  if (!service.isReady) {
    return next(new NotReadyError('Language Server is still loading'))
  }

  next()
}

export const assertValidLanguage = (service: LanguageService) => (req, _res, next) => {
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

  req.language = language
  next()
}
