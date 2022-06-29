import * as q from '@botpress/distributed'
import { TrainingError, TrainingStatus } from '@botpress/nlu-client'
import _ from 'lodash'
import { Training, TrainingId, TrainingRepository } from '../../infrastructure'
import { MAX_TRAINING_HEARTBEAT } from '.'
import { TrainTask, TrainTaskRepository } from './typings'

/** Maps tasks to trainings */

const zombieError: TrainingError = {
  type: 'zombie-training',
  message: `Zombie Training: Training has not been updated in more than ${MAX_TRAINING_HEARTBEAT} ms.`
}

const mapTrainStatusToTaskStatus = (trainStatus: TrainingStatus): q.TaskStatus => {
  if (trainStatus === 'training') {
    return 'running'
  }
  if (trainStatus === 'training-pending') {
    return 'pending'
  }
  return trainStatus
}

const mapTaskStatusToTrainStatus = (taskStatus: Exclude<q.TaskStatus, 'zombie'>): TrainingStatus => {
  if (taskStatus === 'running') {
    return 'training'
  }
  if (taskStatus === 'pending') {
    return 'training-pending'
  }
  return taskStatus
}

const mapTrainingToTask = (training: Training): TrainTask => {
  const { appId, modelId, status, cluster, progress, dataset, trainingTime, error } = training
  const isZombie = error?.type === 'zombie-training'

  return {
    appId,
    modelId,
    cluster,
    status: isZombie ? 'zombie' : mapTrainStatusToTaskStatus(status),
    progress: { start: 0, end: 100, current: progress },
    data: { trainingTime },
    input: dataset,
    error: isZombie ? undefined : error
  }
}

const mapTaskQueryToTrainingQuery = (task: Partial<TrainTask>): Partial<Training> => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  const { trainingTime } = data ?? {}
  const isZombie = status === 'zombie'

  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: isZombie ? 'errored' : status && mapTaskStatusToTrainStatus(status),
      trainingTime,
      dataset: input,
      progress: progress?.current,
      error: isZombie ? zombieError : error
    },
    (x) => x !== undefined
  )
}

const mapTaskToTraining = (task: TrainTask): Training => {
  const { appId, modelId, input, data, error, status, cluster, progress } = task
  const { trainingTime } = data
  const isZombie = status === 'zombie'

  return {
    appId,
    modelId,
    cluster,
    status: isZombie ? 'errored' : mapTaskStatusToTrainStatus(status),
    trainingTime,
    dataset: input,
    progress: progress.current,
    error: isZombie ? zombieError : error
  }
}

export class TrainTaskRepo implements TrainTaskRepository {
  constructor(private _trainRepo: TrainingRepository) {}
  public has = this._trainRepo.has.bind(this._trainRepo)

  public async get(taskId: TrainingId): Promise<TrainTask | undefined> {
    const training = await this._trainRepo.get(taskId)
    return training && mapTrainingToTask(training)
  }

  public async query(taskQuery: Partial<TrainTask>): Promise<TrainTask[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.query(trainQuery)
    return trainings.map(mapTrainingToTask)
  }

  public async queryOlderThan(taskQuery: Partial<TrainTask>, threshold: Date): Promise<TrainTask[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.queryOlderThan(trainQuery, threshold)
    return trainings.map(mapTrainingToTask)
  }

  public async set(task: TrainTask): Promise<void> {
    const training = mapTaskToTraining(task)
    return this._trainRepo.set(training)
  }
}
