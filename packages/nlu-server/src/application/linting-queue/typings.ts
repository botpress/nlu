import { queues } from '@botpress/distributed'
import { DatasetIssue, IssueCode, LintingError, TrainInput } from '@botpress/nlu-client'
import { LintingId } from '../../infrastructure'

type LintData = {
  issues: DatasetIssue<IssueCode>[]
}

export type TerminatedLintTask = queues.TerminatedTask<LintingId, TrainInput, LintData, LintingError>
export type LintTask = queues.Task<LintingId, TrainInput, LintData, LintingError>
export type LintTaskRunner = queues.TaskRunner<LintingId, TrainInput, LintData, LintingError>
export type LintTaskProgress = queues.ProgressCb<LintingId, TrainInput, LintData, LintingError>
export type LintTaskRepository = queues.TaskRepository<LintingId, TrainInput, LintData, LintingError>
export type LintTaskQueue = queues.TaskQueue<LintingId, TrainInput, LintData, LintingError>
export type LintTaskQueueOptions = queues.QueueOptions<LintingId, TrainInput, LintData, LintingError>
