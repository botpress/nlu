import { DatasetIssue, IssueCode, LintingErrorType } from '@botpress/nlu-client'

export type LintTaskData = {
  issues: DatasetIssue<IssueCode>[]
}

export type LintTaskError = {
  actualErrorType: LintingErrorType
}
