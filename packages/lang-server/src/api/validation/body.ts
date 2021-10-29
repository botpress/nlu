import { TokenizeRequestBody, VectorizeRequestBody } from '@botpress/lang-client'
import { LanguageService } from '@botpress/nlu-engine'
import _ from 'lodash'
import { BadRequestError } from '../errors'
import { validateLanguage } from './lang-path'

export const validateTokenizeRequestBody = (service: LanguageService) => {
  const languageValidator = validateLanguage(service)

  return (body: any): TokenizeRequestBody => {
    const { utterances, language } = body
    if (!utterances || !utterances.length || !_.isArray(utterances) || utterances.some((u) => !_.isString(u))) {
      throw new BadRequestError('Param "utterances" is mandatory (must be an array of strings)')
    }

    return {
      utterances,
      language: languageValidator(language)
    }
  }
}

export const validateVectorizeRequestBody = (service: LanguageService) => {
  const languageValidator = validateLanguage(service)

  return (body: any): VectorizeRequestBody => {
    const { tokens, language } = body
    if (!tokens || !tokens.length || !_.isArray(tokens) || tokens.some((t) => !_.isString(t))) {
      throw new BadRequestError('Param "tokens" is mandatory (must be an array of strings)')
    }
    return {
      tokens,
      language: languageValidator(language)
    }
  }
}
