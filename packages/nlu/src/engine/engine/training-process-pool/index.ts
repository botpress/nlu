import { errors, makeProcessPool, ProcessPool } from '@botpress/worker'
import _ from 'lodash'
import path from 'path'
import Logger from '../../../utils/logger'
import { TrainingAlreadyStarted, TrainingCanceled, TrainingExitedUnexpectedly } from '../../errors'

import { LanguageConfig } from '../../typings'
import { TrainInput, TrainOutput } from '../training-pipeline'

const logger = Logger.sub('training')

const PROCESS_ENTRY_POINT = 'process-entry-point.js'

export class TrainingProcessPool {
  private _processPool: ProcessPool<TrainInput, TrainOutput>

  constructor(config: LanguageConfig) {
    this._processPool = makeProcessPool<TrainInput, TrainOutput>(logger, {
      maxWorkers: -1,
      entryPoint: path.resolve(__dirname, PROCESS_ENTRY_POINT),
      env: {
        ...process.env,
        NLU_CONFIG: JSON.stringify(config)
      }
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
