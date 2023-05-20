import _ from 'lodash'

export type Token = {
  value: string

  isWord: boolean
  isSpace: boolean

  startChar: number
  endChar: number
  startToken: number
  endToken: number
}

const SPECIAL_CHARSET = '¿÷≥≤µ˜∫√≈æ…¬˚˙©+-_!@#$%?&*()/\\[]{}:;<>=.,~`"\''.split('').map((c) => `\\${c}`)
export const isWord = (str: string) => _.every(SPECIAL_CHARSET, (c) => !RegExp(c).test(str)) && !hasSpace(str)
export const hasSpace = (str: string) => _.some(str, isSpace)
export const isSpace = (str: string) => _.every(str, (c) => c === ' ')

export const toTokens = (strTokens: string[]): Token[] => {
  const tokens: Token[] = []

  let charIndex = 0

  for (let i = 0; i < strTokens.length; i++) {
    const strToken = strTokens[i]

    const token: Token = {
      value: strToken,

      isWord: isWord(strToken),
      isSpace: isSpace(strToken),

      startChar: charIndex,
      endChar: charIndex + strToken.length,
      startToken: i,
      endToken: i + 1
    }

    tokens.push(token)

    charIndex += strToken.length
  }

  return tokens
}
