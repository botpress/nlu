import { queues } from '@botpress/distributed'
import { TrainingError, TrainingErrorType, TrainingStatus, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { Training, TrainingId } from '../../infrastructure'
import { TrainData } from './typings'

export const mapTrainIdtoTaskId = (trainId: TrainingId): string => {
  const { appId, modelId } = trainId
  const stringModelId = NLUEngine.modelIdService.toString(modelId)
  return `${appId}/${stringModelId}`
}

export const mapTaskIdToTrainId = (taskId: string): TrainingId => {
  const [appId, modelId] = taskId.split('/')
  return { appId, modelId: NLUEngine.modelIdService.fromString(modelId) }
}

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
  if (taskStatus === 'errored') {
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

// TODO: there is more error type than task type
export const mapTaskErrorTypeToTrainErrorType = (taskErrorType: queues.TaskErrorType): TrainingErrorType => {
  if (taskErrorType === 'zombie-task') {
    return 'zombie-training'
  }
  return 'internal'
}

export const mapTrainErrorTypeToTaskErrorType = (trainErrorType: TrainingErrorType): queues.TaskErrorType => {
  if (trainErrorType === 'zombie-training') {
    return 'zombie-task'
  }
  return 'internal'
}

export const mapTaskErrorToTrainError = (taskError: queues.TaskError): TrainingError => {
  const { type: taskType, message, stack } = taskError
  const type = mapTaskErrorTypeToTrainErrorType(taskType)
  return { type, message, stack }
}

export const mapTrainErrorToTaskError = (trainError: TrainingError): queues.TaskError => {
  const { type: trainType, message, stack } = trainError
  const type = mapTrainErrorTypeToTaskErrorType(trainType)
  return { type, message, stack }
}

export const mapTrainingToTask = (training: Training): queues.Task<TrainInput, TrainData> => {
  const { appId, modelId, status, cluster, progress, dataset, trainingTime, error } = training
  return {
    id: mapTrainIdtoTaskId({ appId, modelId }),
    cluster,
    status: mapTrainStatusToTaskStatus(status),
    data: { trainingTime },
    input: dataset,
    progress: { start: 0, end: 100, current: progress },
    error: error && mapTrainErrorToTaskError(error)
  }
}

export const mapTaskQueryToTrainingQuery = (task: Partial<queues.Task<TrainInput, TrainData>>): Partial<Training> => {
  const { id, status, cluster, progress, input, data, error } = task
  const { trainingTime } = data ?? {}
  const { appId, modelId } = id ? mapTaskIdToTrainId(id) : <Partial<TrainingId>>{}
  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: status && mapTaskStatusToTrainStatus(status),
      trainingTime,
      dataset: input,
      progress: progress?.current,
      error: error && mapTaskErrorToTrainError(error)
    },
    (x) => x !== undefined
  )
}

export const mapTaskToTraining = (task: queues.Task<TrainInput, TrainData>): Training => {
  const { id, status, cluster, progress, input, data, error } = task
  const { trainingTime } = data
  const { appId, modelId } = mapTaskIdToTrainId(id)
  return {
    appId,
    modelId,
    cluster,
    status: mapTaskStatusToTrainStatus(status),
    trainingTime,
    dataset: input,
    progress: progress.current,
    error: error && mapTaskErrorToTrainError(error)
  }
}
