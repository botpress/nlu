import _ from 'lodash'
import { DatasetIssue, IssueDefinition } from 'src/hints'
import { IntentDefinition, TrainInput } from 'src/typings'
import { ParsedSlot, parseUtterance } from '../utterance/utterance-parser'
import { asCode, IssueChecker } from './typings'

const code = asCode('C_000')

export const C_000: IssueDefinition<typeof code> = {
  code,
  severity: 'critical',
  name: 'tokens_tagged_with_unexisting_slot',
  speed: 'fastest'
}

const validateIntent = (i: IntentDefinition): DatasetIssue<typeof code>[] => {
  const { slots, utterances } = i

  const isInvalid = (s: ParsedSlot) => !slots.map((s) => s.name).includes(s.name)

  return _(utterances)
    .map(parseUtterance)
    .flatMap(({ parsedSlots, utterance }) => {
      const invalidSlots = parsedSlots.filter(isInvalid)
      return invalidSlots.map((invalidSlot) => {
        const { start, end } = invalidSlot.cleanPosition
        const faultyTokens = utterance.substring(start, end)

        const issue: DatasetIssue<typeof code> = {
          ...C_000,
          message: `Tokens "${faultyTokens}" of intent "${i.name}" are tagged with a slot that does not exist: "${invalidSlot.name}"`,
          data: {
            intent: i.name,
            slot: invalidSlot.name,
            utterance
          }
        }
        return issue
      })
    })
    .value()
}

export const C_000_Check: IssueChecker<typeof code> = {
  ...C_000,
  check: async (ts: TrainInput) => {
    let issues: DatasetIssue<typeof code>[] = []
    for (const i of ts.intents) {
      issues = [...issues, ...validateIntent(i)]
    }
    return issues
  }
}
