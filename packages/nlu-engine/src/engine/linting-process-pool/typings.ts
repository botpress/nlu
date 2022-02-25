import { DatasetIssue, IssueCode, IssueComputationSpeed } from '../../linting'
import { TrainInput } from '../../typings'

export type LintingInput = {
  lintId: string
  trainSet: TrainInput
  minSpeed: IssueComputationSpeed
}

export type LintingOuput = { issues: DatasetIssue<IssueCode>[] }

export type LintingProgress = { total: number; current: number; issues: DatasetIssue<IssueCode>[] }
