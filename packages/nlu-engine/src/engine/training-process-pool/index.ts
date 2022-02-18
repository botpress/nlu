import { errors, makeProcessPool, ProcessPool } from '@botpress/worker'
import _ from 'lodash'
import { LanguageConfig, Logger } from '../../typings'
import { TrainingAlreadyStartedError, TrainingCanceledError, TrainingExitedUnexpectedlyError } from '../errors'

import { TrainInput, TrainOutput } from '../training-pipeline'
import { ErrorHandler } from './error-handler'
import { ENTRY_POINT } from './process-entry-point'

export class TrainingProcessPool {
  private _processPool: ProcessPool<TrainInput, TrainOutput>

  constructor(private _logger: Logger, config: LanguageConfig) {
    const env = {
      ...process.env,
      NLU_CONFIG: JSON.stringify(config)
    }

    this._processPool = makeProcessPool<TrainInput, TrainOutput>(this._logger, {
      maxWorkers: Number.POSITIVE_INFINITY,
      entryPoint: ENTRY_POINT,
      env,
      errorHandler: new ErrorHandler()
    })
  }

  public async cancelTraining(trainId: string): Promise<void> {
    return this._processPool.cancel(trainId)
  }

  public async startTraining(input: TrainInput, progress: (x: number) => void): Promise<TrainOutput> {
    try {
      const ouput = await this._processPool.run(input.trainId, input, progress)
      return ouput
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      if (err instanceof errors.TaskCanceledError) {
        throw new TrainingCanceledError()
      }
      if (err instanceof errors.TaskAlreadyStartedError) {
        throw new TrainingAlreadyStartedError()
      }
      if (err instanceof errors.TaskExitedUnexpectedlyError) {
        throw new TrainingExitedUnexpectedlyError(err.wid!, err)
      }
      throw err
    }
  }
}
