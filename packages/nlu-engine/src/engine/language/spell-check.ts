import _ from 'lodash'
import { Predictors } from '../predict-pipeline'
import { isWord } from '../tools/token-utils'
import { getClosestSpellingToken } from '../tools/vocab'
import Utterance, { UtteranceToken } from '../utterance/utterance'

function isClosestTokenValid(originalToken: UtteranceToken, closestToken: string): boolean {
  return isWord(closestToken) && originalToken.value.length > 3 && closestToken.length > 3
}

/**
 * @description Returns slightly different version of the given utterance, replacing OOV tokens with their closest spelling neighbour
 * @param utterance the original utterance
 * @param vocab Bot wide vocabulary
 */
export function spellCheck(utterance: Utterance, vocab: string[]): string {
  const spellchecked = _.chain(utterance.tokens)
    .map((token: UtteranceToken) => {
      const strTok = token.toString({ lowerCase: false })

      const lowerCasedToken = strTok.toLowerCase()
      if (!token.isWord || vocab.includes(lowerCasedToken) || !_.isEmpty(token.entities)) {
        return strTok
      }

      const closestToken: string = getClosestSpellingToken(lowerCasedToken, vocab)
      if (isClosestTokenValid(token, closestToken)) {
        return closestToken
      }

      return strTok
    })
    .join('')
    .value()

  return spellchecked
}
