import { IssueDefinition } from '../../linting'
import { TrainInput } from '../../typings'
import { asCode, IssueLinter } from './typings'

const code = asCode('E_000')

export const E_000: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'tokens_tagged_with_slot_has_incorrect_type'
}

export const E_000_Linter: IssueLinter<typeof code> = {
  ...E_000,
  speed: 'fastest',
  lint: async (ts: TrainInput) => {
    return []
  }
}
