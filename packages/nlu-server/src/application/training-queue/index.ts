import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'

import { ModelRepository, TrainingRepository } from '../../infrastructure'
import { TrainingAlreadyStartedError, TrainingNotFoundError } from '../errors'
import { TrainHandler } from './train-handler'
import { mapTrainIdtoTaskId } from './train-task-mapper'
import { TrainTaskRepo } from './train-task-repo'
import { TrainTaskData, TrainTaskError } from './typings'

export const MIN_TRAINING_HEARTBEAT = ms('10s')
export const PROGRESS_THROTTLE = MIN_TRAINING_HEARTBEAT / 2
export const MAX_TRAINING_HEARTBEAT = MIN_TRAINING_HEARTBEAT * 3
const TASK_OPTIONS: Partial<queues.QueueOptions<TrainInput, TrainTaskData, TrainTaskError>> = {
  maxProgressDelay: MAX_TRAINING_HEARTBEAT,
  progressThrottle: PROGRESS_THROTTLE
}

export type TrainQueueOptions = {
  maxTraining?: number
}

export abstract class TrainingQueue {
  constructor(
    private trainingRepo: TrainingRepository,
    private taskQueue: queues.TaskQueue<TrainInput, TrainTaskData, TrainTaskError>,
    private logger: Logger
  ) {}

  public addListener = this.trainingRepo.addListener.bind(this.trainingRepo)
  public removeListener = this.trainingRepo.removeListener.bind(this.trainingRepo)
  public initialize = this.taskQueue.initialize.bind(this.taskQueue)
  public teardown = this.taskQueue.teardown.bind(this.taskQueue)
  public getLocalTrainingCount = this.taskQueue.getLocalTaskCount.bind(this.taskQueue)

  public queueTraining = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    try {
      const taskId = mapTrainIdtoTaskId({ modelId, appId })
      await this.taskQueue.queueTask(taskId, trainInput)
      this.logger.info(`[${taskId}] Training Queued.`)
    } catch (thrown) {
      if (thrown instanceof queues.TaskAlreadyStartedError) {
        throw new TrainingAlreadyStartedError(appId, modelId)
      }
      throw thrown
    }
  }

  public async cancelTraining(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    try {
      const taskId = mapTrainIdtoTaskId({ modelId, appId })
      await this.taskQueue.cancelTask(taskId)
    } catch (thrown) {
      if (thrown instanceof queues.TaskNotFoundError) {
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
    logger: Logger,
    opt: TrainQueueOptions = {}
  ) {
    const trainTaskRepo = new TrainTaskRepo(trainingRepo)
    const trainHandler = new TrainHandler(engine, modelRepo, logger.sub('training-queue'))
    const taskQueue = new queues.PGDistributedTaskQueue(pgURL, trainTaskRepo, trainHandler, logger, {
      ...TASK_OPTIONS,
      maxTasks: opt.maxTraining
    })
    super(trainingRepo, taskQueue, logger)
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
    const trainTaskRepo = new TrainTaskRepo(trainingRepo)
    const logger = baseLogger.sub('training-queue')
    const trainHandler = new TrainHandler(engine, modelRepo, logger)
    const taskQueue = new queues.LocalTaskQueue(trainTaskRepo, trainHandler, logger, {
      ...TASK_OPTIONS,
      maxTasks: opt.maxTraining
    })
    super(trainingRepo, taskQueue, logger)
  }
}
