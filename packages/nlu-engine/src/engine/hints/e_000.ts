import { IssueDefinition } from 'src/hints'
import { TrainInput } from 'src/typings'
import { asCode, IssueChecker } from './typings'

const code = asCode('E_000')

export const E_000: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'tokens_tagged_with_slot_has_incorrect_type',
  speed: 'fast'
}

export const E_000_Check: IssueChecker<typeof code> = {
  ...E_000,
  check: async (ts: TrainInput) => {
    return []
  }
}
