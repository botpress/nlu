import _ from 'lodash'
import { TrainInput } from 'src/typings'
import { DatasetIssue, IssueCode, IssueDefinition } from '../../linting'
import { Tools } from '../typings'

export const asCode = <C extends IssueCode>(c: C): C => c

export type IssueComputationSpeed = 'fastest' | 'fast' | 'slow' | 'slowest'

export type IssueLinter<C extends IssueCode> = IssueDefinition<C> & {
  speed: IssueComputationSpeed
  lint: (ts: TrainInput, tools: Tools) => Promise<DatasetIssue<C>[]>
}
