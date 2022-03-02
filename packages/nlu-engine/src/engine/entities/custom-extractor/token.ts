import { convertToRealSpaces } from '../../tools/token-utils'
import { DefaultTokenToStringOptions, TokenToStringOptions, UtteranceToStringOptions } from '../../utterance/utterance'

export type ListEntityUtteranceToken = Readonly<{
  value: string
  isWord: boolean
  isSpace: boolean
  offset: number
}>

export type Utterance = {
  tokens: ReadonlyArray<ListEntityUtteranceToken>
  toString: (opt?: Partial<UtteranceToStringOptions>) => string
}

export const keepTokenProperties = (token: ListEntityUtteranceToken): ListEntityUtteranceToken => {
  const { value, isWord, isSpace, offset } = token
  return { value, isWord, isSpace, offset }
}

/**
 *
 * @description Copied from UtteranceToken.toString()
 * @returns a string
 */
export const tokenToString = (token: ListEntityUtteranceToken, opts: Partial<TokenToStringOptions> = {}) => {
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
