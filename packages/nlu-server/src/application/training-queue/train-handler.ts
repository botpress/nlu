import { Logger } from '@botpress/logger'
import { TrainingErrorType } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { ModelRepository } from '../../infrastructure'
import { idToString, MIN_TRAINING_HEARTBEAT } from '.'
import { TerminatedTrainTask, TrainTask, TrainTaskProgress, TrainTaskRunner } from './typings'

const MAX_MODEL_PER_USER_PER_LANG = 1

export class TrainHandler implements TrainTaskRunner {
  constructor(private engine: NLUEngine.Engine, private modelRepo: ModelRepository, private logger: Logger) {}

  public run = async (task: TrainTask, progressCb: TrainTaskProgress): Promise<TerminatedTrainTask | undefined> => {
    const trainKey = idToString(task)

    this.logger.debug(`training "${trainKey}" is about to start.`)

    const startTime = new Date()

    const { input, appId } = task
    try {
      const model = await this.engine.train(trainKey, input, {
        progressCallback: (p: number) => progressCb({ start: 0, end: 100, current: p }),
        minProgressHeartbeat: MIN_TRAINING_HEARTBEAT
      })

      const { language: languageCode } = input

      const keep = MAX_MODEL_PER_USER_PER_LANG - 1 // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.pruneModels(appId, { keep }, { languageCode })
      await this.modelRepo.saveModel(appId, model)

      task.data.trainingTime = this._getTrainingTime(startTime)

      this.logger.info(`[${trainKey}] Training Done.`)
      return { ...task, status: 'done' }
    } catch (thrownObject) {
      const err = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)

      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${trainKey}] Training Canceled.`)

        task.data.trainingTime = this._getTrainingTime(startTime)
        return { ...task, status: 'canceled' }
      }

      if (NLUEngine.errors.isTrainingAlreadyStarted(err)) {
        this.logger.warn(`[${trainKey}] Training Already Started.`) // This should never occur.
        return
      }

      let type: TrainingErrorType = 'internal'
      if (NLUEngine.errors.isLangServerError(err)) {
        type = 'lang-server'
        this.logger.attachError(err).error(`[${trainKey}] Error occured with Language Server.`)
      }

      if (NLUEngine.errors.isDucklingServerError(err)) {
        type = 'duckling-server'
        this.logger.attachError(err).error(`[${trainKey}] Error occured with Duckling Server.`)
      }

      task.data = { trainingTime: this._getTrainingTime(startTime) }
      const { message, stack } = err
      task.error = { message, stack, type }

      if (type === 'internal') {
        this.logger.attachError(err as Error).error(`[${trainKey}] Error occured during training.`)
      }

      return { ...task, status: 'errored' }
    }
  }

  public cancel(task: TrainTask): Promise<void> {
    const trainKey = idToString(task)
    return this.engine.cancelTraining(trainKey)
  }

  private _getTrainingTime(startTime: Date) {
    const endTime = new Date()
    return endTime.getTime() - startTime.getTime()
  }
}
