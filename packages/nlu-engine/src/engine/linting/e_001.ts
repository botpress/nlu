import { IssueDefinition } from '../../linting'
import { asCode } from './typings'

const code = asCode('E_001')

export const E_001: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'slot_has_nonexistent_entity'
}

// no linter implemented yet
