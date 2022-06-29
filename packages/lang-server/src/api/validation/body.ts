import { TokenizeRequestBody, VectorizeRequestBody } from '@botpress/lang-client'
import _ from 'lodash'
import { BadRequestError } from '../errors'

export const validateTokenizeRequestBody = (body: any): TokenizeRequestBody => {
  const { utterances } = body
  if (!utterances || !utterances.length || !_.isArray(utterances) || utterances.some((u) => !_.isString(u))) {
    throw new BadRequestError('Param "utterances" is mandatory (must be an array of strings)')
  }

  return {
    utterances
  }
}

export const validateVectorizeRequestBody = (body: any): VectorizeRequestBody => {
  const { tokens } = body
  if (!tokens || !tokens.length || !_.isArray(tokens) || tokens.some((t) => !_.isString(t))) {
    throw new BadRequestError('Param "tokens" is mandatory (must be an array of strings)')
  }
  return {
    tokens
  }
}
