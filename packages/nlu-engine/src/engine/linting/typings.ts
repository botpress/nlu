import _ from 'lodash'
import { DatasetIssue, IssueCode, IssueComputationSpeed, IssueDefinition } from '../../linting'
import { LintingProgressCb, TrainInput } from '../../typings'
import { Tools } from '../typings'
import { AllSeverities } from './severity'

export const asCode = <C extends IssueCode>(c: C): C => c

export type IssueLinter<C extends IssueCode> = IssueDefinition<C> & {
  speed: IssueComputationSpeed
  lint: (ts: TrainInput, tools: Tools) => Promise<DatasetIssue<C>[]>
}

export type LintingOptions = {
  minSpeed: IssueComputationSpeed
  minSeverity: AllSeverities
  progressCallback: LintingProgressCb
}
