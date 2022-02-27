import _ from 'lodash'
import { TrainInput } from 'src/typings'
import { DatasetIssue, IssueData, IssueDefinition } from '../../linting'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const LEADING_SPACES = /^ +/
const TRAILING_SPACES = / +$/
const CONSECUTIVE_SPACES = /\s{2,}/g

const code = asCode('E_004')

type VerificationUnit = {
  intent: string
  utteranceIdx: number
  utterance: string
}

export const E_004: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
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

const makeIssue = (data: IssueData<typeof code>, message: string): DatasetIssue<typeof code> => ({
  ...E_004,
  id: computeId(code, data),
  data,
  message
})

const getSpan = (regexpMatch: RegExpExecArray) => ({
  charStart: regexpMatch.index,
  charEnd: regexpMatch.index + regexpMatch[0].length
})

const checkUtterance = (unit: VerificationUnit): DatasetIssue<typeof code>[] => {
  const issues: DatasetIssue<typeof code>[] = []
  const leadingSpacesMatch = LEADING_SPACES.exec(unit.utterance)
  if (leadingSpacesMatch) {
    const span = getSpan(leadingSpacesMatch)
    issues.push(
      makeIssue(
        {
          ...unit,
          ...span
        },
        'utterance should not start with spaces.'
      )
    )
  }

  const trailingSpaceMatch = TRAILING_SPACES.exec(unit.utterance)
  if (trailingSpaceMatch) {
    const span = getSpan(trailingSpaceMatch)
    issues.push(
      makeIssue(
        {
          ...unit,
          ...span
        },
        'utterance should not end with spaces.'
      )
    )
  }

  let dupplicatedSpacesMatch = CONSECUTIVE_SPACES.exec(unit.utterance)
  while (dupplicatedSpacesMatch) {
    const span = getSpan(dupplicatedSpacesMatch)

    if (span.charStart !== 0 && span.charEnd !== unit.utterance.length) {
      issues.push(
        makeIssue(
          {
            ...unit,
            charStart: span.charStart + 1,
            charEnd: span.charEnd
          },
          'utterance has consecutive spaces.'
        )
      )
    }

    dupplicatedSpacesMatch = CONSECUTIVE_SPACES.exec(unit.utterance)
  }

  return issues
}

export const E_004_Linter: IssueLinter<typeof code> = {
  ...E_004,
  speed: 'fastest',
  lint: async (ts: TrainInput) => {
    const units = flattenDataset(ts)
    const issues = units.flatMap(checkUtterance)

    return issues
  }
}
