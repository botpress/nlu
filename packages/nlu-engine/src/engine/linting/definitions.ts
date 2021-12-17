import { IssueCode, IssueDefinition } from '../../linting'
import { C_000 } from './c_000'
import { C_001 } from './c_001'
import { C_002 } from './c_002'
import { E_000 } from './e_000'

type IssueDefinitions = {
  [C in IssueCode]: IssueDefinition<C>
}

export const allIssues: Partial<IssueDefinitions> = {
  ['C_000']: C_000,
  ['C_001']: C_001,
  ['C_002']: C_002,
  ['E_000']: E_000
}
