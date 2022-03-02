import { Logger } from '@botpress/logger'
import { DatasetIssue, IssueCode, LintingError } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { LintingId } from '../../infrastructure'
import { idToString } from '../training-queue'
import { LintTask, LintTaskProgress, LintTaskRunner, TerminatedLintTask } from './typings'

export class LintHandler implements LintTaskRunner {
  constructor(private _engine: NLUEngine.Engine, private _logger: Logger) {}

  public run = async (task: LintTask, progressCb: LintTaskProgress): Promise<TerminatedLintTask | undefined> => {
    const lintKey = idToString(task)
    try {
      const allIssues: DatasetIssue<IssueCode>[] = []
      await this._engine.lint(lintKey, task.input, {
        minSpeed: 'slow',
        progressCallback: (currentCount: number, totalCount: number, issues: DatasetIssue<IssueCode>[]) => {
          allIssues.push(...issues)
          return progressCb({ start: 0, end: totalCount, current: currentCount }, { issues: allIssues })
        }
      })
      this._logger.info(`[${lintKey}] Linting Done.`)
      return { ...task, status: 'done' }
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      const error: LintingError = { message: err.message, stack: err.stack, type: 'internal' }
      return { ...task, status: 'errored', error }
    }
  }

  public async cancel(task: LintingId): Promise<void> {
    const trainKey = idToString(task)
    return this._engine.cancelTraining(trainKey)
  }
}
