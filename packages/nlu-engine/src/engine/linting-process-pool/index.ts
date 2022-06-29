import { errors, makeProcessPool, ProcessPool } from '@botpress/worker'
import _ from 'lodash'
import { LanguageConfig, LintingProgressCb, Logger } from '../../typings'
import { LintingAlreadyStartedError, LintingCanceledError, LintingExitedUnexpectedlyError } from '../errors'
import { ErrorHandler } from '../training-process-pool/error-handler'
import { ENTRY_POINT } from './process-entry-point'
import { LintingInput, LintingOuput, LintingProgress } from './typings'

export class LintingProcessPool {
  private _processPool: ProcessPool<LintingInput, LintingOuput, LintingProgress>

  constructor(private _logger: Logger, config: LanguageConfig) {
    const env = {
      ...process.env,
      NLU_CONFIG: JSON.stringify(config)
    }

    this._processPool = makeProcessPool<LintingInput, LintingOuput, LintingProgress>(this._logger, {
      maxWorkers: Number.POSITIVE_INFINITY,
      entryPoint: ENTRY_POINT,
      env,
      errorHandler: new ErrorHandler()
    })
  }

  public async cancelLinting(lintId: string): Promise<void> {
    return this._processPool.cancel(lintId)
  }

  public async startLinting(input: LintingInput, progress: LintingProgressCb): Promise<LintingOuput> {
    try {
      const output = await this._processPool.run(
        input.lintId,
        input,
        (_p: number, { current, total, issues }: LintingProgress) => progress(current, total, issues)
      )
      return output
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      if (err instanceof errors.TaskCanceledError) {
        throw new LintingCanceledError()
      }
      if (err instanceof errors.TaskAlreadyStartedError) {
        throw new LintingAlreadyStartedError()
      }
      if (err instanceof errors.TaskExitedUnexpectedlyError) {
        throw new LintingExitedUnexpectedlyError(err.wid!, err)
      }
      throw err
    }
  }
}
