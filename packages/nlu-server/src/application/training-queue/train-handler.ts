import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainingErrorType, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { ModelRepository } from '../../infrastructure'
import { MIN_TRAINING_HEARTBEAT, PROGRESS_THROTTLE } from '.'
import { mapTaskToTraining, mapTrainingToTask } from './train-task-mapper'
import { TrainTaskData, TrainTaskError } from './typings'

const MAX_MODEL_PER_USER_PER_LANG = 1

export class TrainHandler implements queues.TaskRunner<TrainInput, TrainTaskData, TrainTaskError> {
  constructor(private engine: NLUEngine.Engine, private modelRepo: ModelRepository, private logger: Logger) {}

  public run = async (
    task: queues.Task<TrainInput, TrainTaskData, TrainTaskError>,
    progressCb: queues.ProgressCb<TrainInput, TrainTaskData, TrainTaskError>
  ): Promise<queues.TerminatedTask<TrainInput, TrainTaskData, TrainTaskError>> => {
    const throttledProgress = _.throttle(progressCb, PROGRESS_THROTTLE)

    const training = mapTaskToTraining(task)

    const trainKey = task.id
    this.logger.debug(`training "${trainKey}" is about to start.`)

    const startTime = new Date()

    const { dataset } = training
    try {
      const model = await this.engine.train(trainKey, dataset, {
        progressCallback: (p: number) => throttledProgress({ start: 0, end: 100, current: p }),
        minProgressHeartbeat: MIN_TRAINING_HEARTBEAT
      })
      throttledProgress.flush()

      const { language: languageCode } = dataset
      const { appId } = training

      const keep = MAX_MODEL_PER_USER_PER_LANG - 1 // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.pruneModels(appId, { keep }, { languageCode })
      await this.modelRepo.saveModel(appId, model)

      training.trainingTime = this._getTrainingTime(startTime)
      training.status = 'done'

      this.logger.info(`[${trainKey}] Training Done.`)
      return mapTrainingToTask(training) as queues.TerminatedTask<TrainInput, TrainTaskData, TrainTaskError>
    } catch (thrownObject) {
      throttledProgress.flush()

      const err = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)

      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${trainKey}] Training Canceled.`)

        training.trainingTime = this._getTrainingTime(startTime)
        training.status = 'canceled'
        return mapTrainingToTask(training) as queues.TerminatedTask<TrainInput, TrainTaskData, TrainTaskError>
      }

      if (NLUEngine.errors.isTrainingAlreadyStarted(err)) {
        this.logger.warn(`[${trainKey}] Training Already Started.`) // This should never occur.
        return mapTrainingToTask(training) as queues.TerminatedTask<TrainInput, TrainTaskData, TrainTaskError>
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

      training.trainingTime = this._getTrainingTime(startTime)
      training.status = 'errored'
      const { message, stack } = err
      training.error = { message, stack, type }

      if (type === 'internal') {
        this.logger.attachError(err as Error).error(`[${trainKey}] Error occured during training.`)
      }

      return mapTrainingToTask(training) as queues.TerminatedTask<TrainInput, TrainTaskData, TrainTaskError>
    }
  }

  public cancel(task: queues.Task<TrainInput, TrainTaskData, TrainTaskError>): Promise<void> {
    return this.engine.cancelTraining(task.id)
  }

  private _getTrainingTime(startTime: Date) {
    const endTime = new Date()
    return endTime.getTime() - startTime.getTime()
  }
}
