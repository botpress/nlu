import { IssueCode, IssueDefinition } from '../../linting'
import { C_000 } from './c_000'
import { C_001 } from './c_001'
import { C_002 } from './c_002'
import { C_003 } from './c_003'
import { E_000 } from './e_000'
import { E_001 } from './e_001'
import { E_002 } from './e_002'
import { E_003 } from './e_003'
import { E_004 } from './e_004'
import { W_000 } from './w_000'

type IssueDefinitions = {
  [C in IssueCode]: IssueDefinition<C>
}

export const allIssues: IssueDefinitions = {
  C_000,
  C_001,
  C_002,
  C_003,
  E_000,
  E_001,
  E_002,
  E_003,
  E_004,
  W_000
}
