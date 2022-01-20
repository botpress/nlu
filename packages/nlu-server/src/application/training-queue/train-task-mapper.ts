import { queues } from '@botpress/distributed'
import { TrainingStatus } from '@botpress/nlu-client'
import _ from 'lodash'
import { Training } from '../../infrastructure'
import { TrainTask } from './typings'

export const mapTrainStatusToTaskStatus = (trainStatus: TrainingStatus): queues.TaskStatus => {
  if (trainStatus === 'done') {
    return 'done'
  }
  if (trainStatus === 'canceled') {
    return 'canceled'
  }
  if (trainStatus === 'errored') {
    return 'errored'
  }
  if (trainStatus === 'training') {
    return 'running'
  }
  if (trainStatus === 'training-pending') {
    return 'pending'
  }
  throw new Error(`Unsuported training status: "${trainStatus}"`)
}

export const mapTaskStatusToTrainStatus = (taskStatus: queues.TaskStatus): TrainingStatus => {
  if (taskStatus === 'done') {
    return 'done'
  }
  if (taskStatus === 'canceled') {
    return 'canceled'
  }
  if (taskStatus === 'errored' || taskStatus === 'zombie') {
    // TODO: do not forget to also create an error for status zombie
    return 'errored'
  }
  if (taskStatus === 'running') {
    return 'training'
  }
  if (taskStatus === 'pending') {
    return 'training-pending'
  }
  throw new Error(`Unsuported task status: "${taskStatus}"`)
}

export const mapTrainingToTask = (training: Training): TrainTask => {
  const { appId, modelId, status, cluster, progress, dataset, trainingTime, error } = training
  return {
    appId,
    modelId,
    cluster,
    status: mapTrainStatusToTaskStatus(status),
    progress: { start: 0, end: 100, current: progress },
    data: { trainingTime },
    input: dataset,
    error
  }
}

export const mapTaskQueryToTrainingQuery = (task: Partial<TrainTask>): Partial<Training> => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  const { trainingTime } = data ?? {}
  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: status && mapTaskStatusToTrainStatus(status),
      trainingTime,
      dataset: input,
      progress: progress?.current,
      error
    },
    (x) => x !== undefined
  )
}

export const mapTaskToTraining = (task: TrainTask): Training => {
  const { appId, modelId, input, data, error, status, cluster, progress } = task
  const { trainingTime } = data
  return {
    appId,
    modelId,
    cluster,
    status: mapTaskStatusToTrainStatus(status),
    trainingTime,
    dataset: input,
    progress: progress.current,
    error
  }
}
