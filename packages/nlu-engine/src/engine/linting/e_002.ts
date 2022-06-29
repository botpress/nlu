import { IssueDefinition } from '../../linting'
import { asCode } from './typings'

const code = asCode('E_002')

export const E_002: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'duplicated_utterances'
}

// no linter implemented yet
