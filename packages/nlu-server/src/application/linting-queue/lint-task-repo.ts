import { queues } from '@botpress/distributed'
import { TrainInput } from '@botpress/nlu-client'
import { LintingRepository } from '../../infrastructure'
import { mapLintingToTask, mapTaskIdToLintId, mapTaskQueryToLintingQuery, mapTaskToLinting } from './lint-task-mapper'
import { LintTaskData, LintTaskError } from './typings'

/** Maps target interface to actual linting repository */
export class LintTaskRepo implements queues.TaskRepository<TrainInput, LintTaskData, LintTaskError> {
  constructor(private _lintRepo: LintingRepository) {}
  public initialize = this._lintRepo.initialize
  public teardown = this._lintRepo.teardown

  public async get(taskId: string): Promise<queues.Task<TrainInput, LintTaskData, LintTaskError> | undefined> {
    const lintId = mapTaskIdToLintId(taskId)
    const linting = await this._lintRepo.get(lintId)
    return linting && mapLintingToTask(linting)
  }

  public async has(taskId: string): Promise<boolean> {
    const lintId = mapTaskIdToLintId(taskId)
    return this._lintRepo.has(lintId)
  }

  public async query(
    taskQuery: Partial<queues.TaskState>
  ): Promise<queues.Task<TrainInput, LintTaskData, LintTaskError>[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.query(lintQuery)
    return lintings.map(mapLintingToTask)
  }

  public async queryOlderThan(
    taskQuery: Partial<queues.TaskState>,
    threshold: Date
  ): Promise<queues.Task<TrainInput, LintTaskData, LintTaskError>[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.queryOlderThan(lintQuery, threshold)
    return lintings.map(mapLintingToTask)
  }

  public async set(task: queues.Task<TrainInput, LintTaskData, LintTaskError>): Promise<void> {
    const linting = mapTaskToLinting(task)
    return this._lintRepo.set(linting)
  }
}
