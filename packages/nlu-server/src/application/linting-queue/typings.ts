import * as q from '@botpress/distributed'
import { DatasetIssue, IssueCode, LintingError, TrainInput } from '@botpress/nlu-client'
import { LintingId } from '../../infrastructure'

type LintData = {
  issues: DatasetIssue<IssueCode>[]
}

export type TerminatedLintTask = q.TerminatedTask<LintingId, TrainInput, LintData, LintingError>
export type LintTask = q.Task<LintingId, TrainInput, LintData, LintingError>
export type LintTaskRunner = q.TaskRunner<LintingId, TrainInput, LintData, LintingError>
export type LintTaskProgress = q.ProgressCb<LintingId, TrainInput, LintData, LintingError>
export type LintTaskRepository = q.TaskRepository<LintingId, TrainInput, LintData, LintingError>
export type LintTaskQueue = q.TaskQueue<LintingId, TrainInput, LintData, LintingError>
export type LintTaskQueueOptions = q.QueueOptions<LintingId, TrainInput, LintData, LintingError>
