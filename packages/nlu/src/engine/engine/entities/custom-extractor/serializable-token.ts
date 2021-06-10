import { convertToRealSpaces } from '../../tools/token-utils'
import { DefaultTokenToStringOptions, TokenToStringOptions, UtteranceToken } from '../../utterance/utterance'

export type SerializableUtteranceToken = Omit<UtteranceToken, 'toString'>

export const serializeUtteranceToken = (token: UtteranceToken): SerializableUtteranceToken => {
  const { toString, ...otherFields } = token
  return { ...otherFields }
}

/**
 *
 * @description Copied from UtteranceToken.toString()
 * @returns a string
 */
export const tokenToString = (token: SerializableUtteranceToken, opts: Partial<TokenToStringOptions> = {}) => {
  const options = { ...DefaultTokenToStringOptions, ...opts }
  let result = token.value
  if (options.lowerCase) {
    result = result.toLowerCase()
  }
  if (options.realSpaces) {
    result = convertToRealSpaces(result)
  }
  if (options.trim) {
    result = result.trim()
  }
  return result
}
