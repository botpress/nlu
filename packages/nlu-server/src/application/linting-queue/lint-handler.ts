import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { DatasetIssue, IssueCode, LintingError, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { PROGRESS_THROTTLE } from '.'
import { mapLintErrorToTaskError } from './lint-task-mapper'
import { LintTaskData, LintTaskError } from './typings'

export class LintHandler implements queues.TaskRunner<TrainInput, LintTaskData, LintTaskError> {
  constructor(private _engine: NLUEngine.Engine, private _logger: Logger) {}

  public run = async (
    task: queues.Task<TrainInput, LintTaskData, LintTaskError>,
    progressCb: queues.ProgressCb<TrainInput, LintTaskData, LintTaskError>
  ): Promise<queues.TerminatedTask<TrainInput, LintTaskData, LintTaskError>> => {
    const throttledProgress = _.throttle(progressCb, PROGRESS_THROTTLE)

    try {
      await this._engine.lint(task.id, task.input, {
        minSpeed: 'slow',
        progressCallback: (currentCount: number, totalCount: number, issues: DatasetIssue<IssueCode>[]) => {
          return throttledProgress({ start: 0, end: totalCount, current: currentCount }, { issues })
        }
      })
      throttledProgress.flush()
      this._logger.info(`[${task.id}] Linting Done.`)
      return { ...task, status: 'done' }
    } catch (thrown) {
      throttledProgress.flush()
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      const error: LintingError = { message: err.message, stack: err.stack, type: 'internal' }
      return { ...task, status: 'errored', error: mapLintErrorToTaskError(error) }
    }
  }

  public async cancel(task: queues.Task<TrainInput, LintTaskData, LintTaskError>): Promise<void> {
    // TODO: make sure linting is cancellable
  }
}
