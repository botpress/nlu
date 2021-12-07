import _ from 'lodash'
import { DatasetIssue, IssueCode, IssueDefinition } from 'src/hints'
import { TrainInput } from 'src/typings'
import { Tools } from '../typings'

export const asCode = <C extends IssueCode>(c: C): C => c

export type IssueComputationSpeed = 'fastest' | 'fast' | 'slow' | 'slowest'

export type IssueChecker<C extends IssueCode> = IssueDefinition<C> & {
  speed: IssueComputationSpeed
  check: (ts: TrainInput, tools: Tools) => Promise<DatasetIssue<C>[]>
}
