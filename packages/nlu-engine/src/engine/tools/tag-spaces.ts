import { SPACE } from './token-utils'

type Span = {
  charStart: number
  charEnd: number
  length: number
}

const getSpan = (regexpMatch: RegExpExecArray): Span => ({
  charStart: regexpMatch.index,
  charEnd: regexpMatch.index + regexpMatch[0].length,
  length: regexpMatch[0].length
})

export const tagAllSpaces = (utt: string): Span[] => {
  const SPACE_GROUP = new RegExp(`[\\s${SPACE}]{1,}`, 'g')
  const spans: Span[] = []
  let match = SPACE_GROUP.exec(utt)
  while (match) {
    const span = getSpan(match)
    spans.push(span)
    match = SPACE_GROUP.exec(utt)
  }
  return spans
}
