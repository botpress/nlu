import { errors, makeProcessPool, ProcessPool } from '@botpress/worker'
import _ from 'lodash'
import { TrainingAlreadyStarted, TrainingCanceled, TrainingExitedUnexpectedly } from '../../errors'

import { LanguageConfig, Logger } from '../../typings'
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
      const { ctx_model, intent_model_by_ctx, slots_model_by_intent, ...others } = await this._processPool.run(
        input.trainId,
        input,
        progress
      )

      return {
        ctx_model: Buffer.from(ctx_model),
        intent_model_by_ctx: _.mapValues(intent_model_by_ctx, Buffer.from),
        slots_model_by_intent: _.mapValues(slots_model_by_intent, Buffer.from),
        ...others
      }
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      if (errors.isTaskCanceled(err)) {
        throw new TrainingCanceled()
      }
      if (errors.isTaskAlreadyStarted(err)) {
        throw new TrainingAlreadyStarted()
      }
      if (errors.isTaskExitedUnexpectedly(err)) {
        // TODO: fix the any casting
        throw new TrainingExitedUnexpectedly((err as any).wid, (err as any).info)
      }
      throw err
    }
  }
}
