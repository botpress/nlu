import _ from 'lodash'
import { TrainInput } from 'src/typings'
import { DatasetIssue, IssueData, IssueDefinition, Span } from '../../linting'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const LEADING_SPACES = /^ +/
const TRAILING_SPACES = / +$/
const CONSECUTIVE_SPACES = /\s{2,}/g

const code = asCode('I_000')

type VerificationUnit = {
  intent: string
  utteranceIdx: number
  utterance: string
}

export const I_000: IssueDefinition<typeof code> = {
  code,
  severity: 'info',
  name: 'dupplicated_or_untrimed_spaces'
}

const flattenDataset = (ts: TrainInput): VerificationUnit[] => {
  return ts.intents.flatMap((intent) =>
    intent.utterances.map((u, i) => ({
      intent: intent.name,
      utterance: u,
      utteranceIdx: i
    }))
  )
}

const makeIssue = (x: VerificationUnit & Span): DatasetIssue<typeof code> => {
  const { intent, utteranceIdx, utterance, start, end } = x
  const data: IssueData<typeof code> = {
    intent,
    utterance: { idx: utteranceIdx, raw: utterance },
    charPos: { raw: { start, end } }
  }
  return {
    ...I_000,
    id: computeId(code, data),
    data,
    message: 'All leading, trailing and consecutives spaces are removed by the NLU engine.'
  }
}

const getSpan = (regexpMatch: RegExpExecArray) => ({
  start: regexpMatch.index,
  end: regexpMatch.index + regexpMatch[0].length
})

const checkUtterance = (unit: VerificationUnit): DatasetIssue<typeof code>[] => {
  const issues: DatasetIssue<typeof code>[] = []
  const leadingSpacesMatch = LEADING_SPACES.exec(unit.utterance)
  if (leadingSpacesMatch) {
    const span = getSpan(leadingSpacesMatch)
    issues.push(
      makeIssue({
        ...unit,
        ...span
      })
    )
  }

  const trailingSpaceMatch = TRAILING_SPACES.exec(unit.utterance)
  if (trailingSpaceMatch) {
    const span = getSpan(trailingSpaceMatch)
    issues.push(
      makeIssue({
        ...unit,
        ...span
      })
    )
  }

  let dupplicatedSpacesMatch = CONSECUTIVE_SPACES.exec(unit.utterance)
  while (dupplicatedSpacesMatch) {
    const span = getSpan(dupplicatedSpacesMatch)

    if (span.start !== 0 && span.end !== unit.utterance.length) {
      issues.push(
        makeIssue({
          ...unit,
          start: span.start + 1,
          end: span.end
        })
      )
    }

    dupplicatedSpacesMatch = CONSECUTIVE_SPACES.exec(unit.utterance)
  }

  return issues
}

export const I_000_Linter: IssueLinter<typeof code> = {
  ...I_000,
  speed: 'fastest',
  lint: async (ts: TrainInput) => {
    const units = flattenDataset(ts)
    const issues = units.flatMap(checkUtterance)

    return issues
  }
}
