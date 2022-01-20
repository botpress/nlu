import _ from 'lodash'
import { DatasetIssue, IssueCode, IssueDefinition } from '../../linting'
import { LintingProgressCb, TrainInput } from '../../typings'
import { Tools } from '../typings'

export const asCode = <C extends IssueCode>(c: C): C => c

export type IssueComputationSpeed = 'fastest' | 'fast' | 'slow' | 'slowest'

export type IssueLinter<C extends IssueCode> = IssueDefinition<C> & {
  speed: IssueComputationSpeed
  lint: (ts: TrainInput, tools: Tools) => Promise<DatasetIssue<C>[]>
}

export type LintingOptions = {
  minSpeed: IssueComputationSpeed
  progressCallback: LintingProgressCb
}
