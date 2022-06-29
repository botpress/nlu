import { IssueDefinition } from '../../linting'
import { asCode } from './typings'

const code = asCode('W_000')

export const W_000: IssueDefinition<typeof code> = {
  code,
  severity: 'warning',
  name: 'intents_are_overlapping'
}

// no linter implemented yet
