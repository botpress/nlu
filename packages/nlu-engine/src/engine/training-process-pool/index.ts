import { errors, makeProcessPool, ProcessPool } from '@botpress/worker'
import _ from 'lodash'
import path from 'path'
import { TrainingAlreadyStarted, TrainingCanceled, TrainingExitedUnexpectedly } from '../../errors'

import { LanguageConfig, Logger } from '../../typings'
import { TrainInput, TrainOutput } from '../training-pipeline'
import { ErrorHandler } from './error-handler'

const PROCESS_ENTRY_POINT = 'process-entry-point.js'

export class TrainingProcessPool {
  private _processPool: ProcessPool<TrainInput, TrainOutput>

  constructor(private _logger: Logger, config: LanguageConfig) {
    const entryPoint = path.resolve(__dirname, PROCESS_ENTRY_POINT)

    const env = {
      ...process.env,
      NLU_CONFIG: JSON.stringify(config)
    }

    this._processPool = makeProcessPool<TrainInput, TrainOutput>(this._logger, {
      maxWorkers: Number.POSITIVE_INFINITY,
      entryPoint,
      env,
      errorHandler: new ErrorHandler()
    })
  }

  public async cancelTraining(trainId: string): Promise<void> {
    return this._processPool.cancel(trainId)
  }

  public async startTraining(input: TrainInput, progress: (x: number) => void): Promise<TrainOutput> {
    try {
      const output = await this._processPool.run(input.trainId, input, progress)
      return output
    } catch (err) {
      if (errors.isTaskCanceled(err)) {
        throw new TrainingCanceled()
      }
      if (errors.isTaskAlreadyStarted(err)) {
        throw new TrainingAlreadyStarted()
      }
      if (errors.isTaskExitedUnexpectedly(err)) {
        throw new TrainingExitedUnexpectedly(err.pid, err.info)
      }
      throw err
    }
  }
}
