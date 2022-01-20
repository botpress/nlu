import { Logger } from '@botpress/logger'
import { DatasetIssue, IssueCode, LintingError } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { PROGRESS_THROTTLE } from '.'
import { LintIdUtil } from './lint-id-utils'
import { LintTask, LintTaskProgress, LintTaskRunner, TerminatedLintTask } from './typings'

export class LintHandler implements LintTaskRunner {
  constructor(private _engine: NLUEngine.Engine, private _logger: Logger) {}

  public run = async (task: LintTask, progressCb: LintTaskProgress): Promise<TerminatedLintTask | undefined> => {
    const throttledProgress = _.throttle(progressCb, PROGRESS_THROTTLE)

    const lintKey = LintIdUtil.toString(task)
    try {
      await this._engine.lint(lintKey, task.input, {
        minSpeed: 'slow',
        progressCallback: (currentCount: number, totalCount: number, issues: DatasetIssue<IssueCode>[]) => {
          return throttledProgress({ start: 0, end: totalCount, current: currentCount }, { issues })
        }
      })
      throttledProgress.flush()
      this._logger.info(`[${lintKey}] Linting Done.`)
      return { ...task, status: 'done' }
    } catch (thrown) {
      throttledProgress.flush()
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      const error: LintingError = { message: err.message, stack: err.stack, type: 'internal' }
      return { ...task, status: 'errored', error }
    }
  }

  public async cancel(task: LintTask): Promise<void> {
    // TODO: make sure linting is cancellable
  }
}
