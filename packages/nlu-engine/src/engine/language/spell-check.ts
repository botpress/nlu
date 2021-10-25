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
 * @param predictors Bot wide vocabulary
 */
export function spellCheck(utterance: Utterance, predictors: Predictors): string {
  const { vocab } = predictors
  const spellchecked = _.chain(utterance.tokens)
    .map((token: UtteranceToken) => {
      const strTok = token.toString()
      if (!token.isWord || vocab.includes(strTok) || !_.isEmpty(token.entities)) {
        return strTok
      }

      const closestToken: string = getClosestSpellingToken(strTok.toLowerCase(), vocab)
      if (isClosestTokenValid(token, closestToken)) {
        return closestToken
      }

      return strTok
    })
    .join('')
    .value()

  return spellchecked
}
