import _ from 'lodash'

export type Tokenizer = (utterance: string) => string[]

export const spaceTokenizer: Tokenizer = (text: string): string[] => {
  return text.split(new RegExp('( )', 'g')).filter(_.identity)
}
