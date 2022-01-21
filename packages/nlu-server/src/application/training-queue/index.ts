import * as q from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'

import { ModelRepository, TrainingId, TrainingRepository } from '../../infrastructure'
import { TrainingAlreadyStartedError, TrainingNotFoundError } from '../errors'
import { TrainHandler } from './train-handler'
import { TrainTaskRepo } from './train-task-repo'
import { TrainTaskQueue, TrainTaskQueueOptions } from './typings'

export const MIN_TRAINING_HEARTBEAT = ms('10s')
export const MAX_TRAINING_HEARTBEAT = MIN_TRAINING_HEARTBEAT * 3
export const TRAINING_PROGRESS_THROTTLE = MIN_TRAINING_HEARTBEAT / 2

const TASK_OPTIONS: TrainTaskQueueOptions = {
  maxTasks: 2,
  initialData: {},
  initialProgress: { start: 0, end: 100, current: 0 },
  maxProgressDelay: MAX_TRAINING_HEARTBEAT,
  progressThrottle: TRAINING_PROGRESS_THROTTLE
}

export type TrainQueueOptions = {
  maxTraining?: number
}

const TRAINING_PREFIX = 'training-queue'

export const idToString = (id: TrainingId) => {
  const { appId, modelId } = id
  const stringModelId = NLUEngine.modelIdService.toString(modelId)
  return `${appId}/${stringModelId}`
}

export abstract class TrainingQueue {
  constructor(private trainingRepo: TrainingRepository, private taskQueue: TrainTaskQueue, private logger: Logger) {}

  public addListener = this.trainingRepo.addListener.bind(this.trainingRepo)
  public removeListener = this.trainingRepo.removeListener.bind(this.trainingRepo)
  public initialize = this.taskQueue.initialize.bind(this.taskQueue)
  public teardown = this.taskQueue.teardown.bind(this.taskQueue)
  public getLocalTrainingCount = this.taskQueue.getLocalTaskCount.bind(this.taskQueue)

  public queueTraining = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    const trainId: TrainingId = { modelId, appId }
    const trainKey: string = idToString(trainId)
    try {
      await this.taskQueue.queueTask(trainId, trainInput)
      this.logger.info(`[${trainKey}] Training Queued.`)
    } catch (thrown) {
      if (thrown instanceof q.TaskAlreadyStartedError) {
        throw new TrainingAlreadyStartedError(appId, modelId)
      }
      throw thrown
    }
  }

  public async cancelTraining(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    try {
      await this.taskQueue.cancelTask({ modelId, appId })
    } catch (thrown) {
      if (thrown instanceof q.TaskNotFoundError) {
        throw new TrainingNotFoundError(appId, modelId)
      }
      throw thrown
    }
  }
}

export class PgTrainingQueue extends TrainingQueue {
  constructor(
    pgURL: string,
    trainingRepo: TrainingRepository,
    engine: NLUEngine.Engine,
    modelRepo: ModelRepository,
    baseLogger: Logger,
    opt: TrainQueueOptions = {}
  ) {
    const trainingLogger = baseLogger.sub('training-queue')
    const trainTaskRepo = new TrainTaskRepo(trainingRepo)
    const trainHandler = new TrainHandler(engine, modelRepo, trainingLogger)

    const options = opt.maxTraining
      ? {
          ...TASK_OPTIONS,
          maxTasks: opt.maxTraining
        }
      : TASK_OPTIONS

    const taskQueue = new q.PGDistributedTaskQueue(
      pgURL,
      trainTaskRepo,
      trainHandler,
      trainingLogger,
      idToString,
      options
    )
    super(trainingRepo, taskQueue, trainingLogger)
  }
}

export class LocalTrainingQueue extends TrainingQueue {
  constructor(
    trainingRepo: TrainingRepository,
    engine: NLUEngine.Engine,
    modelRepo: ModelRepository,
    baseLogger: Logger,
    opt: TrainQueueOptions = {}
  ) {
    const trainingLogger = baseLogger.sub(TRAINING_PREFIX)
    const trainTaskRepo = new TrainTaskRepo(trainingRepo)
    const trainHandler = new TrainHandler(engine, modelRepo, trainingLogger)

    const options = opt.maxTraining
      ? {
          ...TASK_OPTIONS,
          maxTasks: opt.maxTraining
        }
      : TASK_OPTIONS

    const taskQueue = new q.LocalTaskQueue(trainTaskRepo, trainHandler, trainingLogger, idToString, options)
    super(trainingRepo, taskQueue, trainingLogger)
  }
}
