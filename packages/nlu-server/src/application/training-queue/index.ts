import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'

import { ModelRepository, TrainingId, TrainingRepository, TrainingListener } from '../../infrastructure'
import { TrainHandler } from './train-handler'
import { mapTrainIdtoTaskId } from './train-task-mapper'
import { TrainTaskRepo } from './train-task-repo'
import { TrainData } from './typings'

export type TrainQueueOptions = {
  maxTraining?: number
}

export abstract class TrainingQueue {
  constructor(
    private trainingRepo: TrainingRepository,
    private taskQueue: queues.TaskQueue<TrainInput, TrainData>,
    private logger: Logger
  ) {}

  public addListener(listener: TrainingListener) {
    this.trainingRepo.addListener(listener)
  }

  public removeListener(listener: TrainingListener) {
    this.trainingRepo.removeListener(listener)
  }

  public initialize() {
    return this.taskQueue.initialize()
  }

  public teardown() {
    return this.taskQueue.teardown()
  }

  public getLocalTrainingCount = () => {
    return this.taskQueue.getLocalTaskCount()
  }

  public queueTraining = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    const trainId: TrainingId = { modelId, appId }
    const taskId = mapTrainIdtoTaskId(trainId)
    await this.taskQueue.queueTask(taskId, trainInput)
    this.logger.info(`[${taskId}] Training Queued.`)
  }

  public async cancelTraining(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    const trainId: TrainingId = { modelId, appId }
    const taskId = mapTrainIdtoTaskId(trainId)
    return this.taskQueue.cancelTask(taskId)
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
      maxTasks: opt.maxTraining
    })
    super(trainingRepo, taskQueue, logger)
  }
}
