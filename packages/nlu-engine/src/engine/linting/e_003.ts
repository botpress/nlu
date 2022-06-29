import { IssueDefinition } from '../../linting'
import { asCode } from './typings'

const code = asCode('E_003')

export const E_003: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'whole_utterance_is_tagged_as_a_slot'
}

// no linter implemented yet
