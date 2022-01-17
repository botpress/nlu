import { queues } from '@botpress/distributed'
import { LintingError, LintingStatus, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { Linting, LintingId } from '../../infrastructure'
import { LintTaskData, LintTaskError } from './typings'

export const mapLintIdtoTaskId = (lintId: LintingId): string => {
  const { appId, modelId } = lintId
  const stringModelId = NLUEngine.modelIdService.toString(modelId)
  return `${appId}/${stringModelId}`
}

export const mapTaskIdToLintId = (taskId: string): LintingId => {
  const [appId, modelId] = taskId.split('/')
  return { appId, modelId: NLUEngine.modelIdService.fromString(modelId) }
}

export const mapLintStatusToTaskStatus = (lintStatus: LintingStatus): queues.TaskStatus => {
  if (lintStatus === 'done') {
    return 'done'
  }
  if (lintStatus === 'canceled') {
    return 'canceled'
  }
  if (lintStatus === 'errored') {
    return 'errored'
  }
  if (lintStatus === 'linting') {
    return 'running'
  }
  if (lintStatus === 'linting-pending') {
    return 'pending'
  }
  throw new Error(`Unsuported linting status: "${lintStatus}"`)
}

export const mapTaskStatusToLintStatus = (taskStatus: queues.TaskStatus): LintingStatus => {
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
    return 'linting'
  }
  if (taskStatus === 'pending') {
    return 'linting-pending'
  }
  throw new Error(`Unsuported task status: "${taskStatus}"`)
}

export const mapTaskErrorToLintError = (
  taskError: queues.TaskError<TrainInput, LintTaskData, LintTaskError>
): LintingError => {
  const { type: taskType, message, stack } = taskError
  if (taskType === 'zombie-task') {
    return { type: 'zombie-linting', message, stack }
  }
  const { data } = taskError
  return { type: data.actualErrorType, message, stack }
}

export const mapLintErrorToTaskError = (
  lintError: LintingError
): queues.TaskError<TrainInput, LintTaskData, LintTaskError> => {
  const { type: lintType, message, stack } = lintError
  if (lintType === 'zombie-linting') {
    return { type: 'zombie-task', message, stack }
  }
  return { type: 'internal', message, stack, data: { actualErrorType: lintType } }
}

export const mapLintingToTask = (linting: Linting): queues.Task<TrainInput, LintTaskData, LintTaskError> => {
  const { appId, modelId, status, cluster, currentCount, totalCount, dataset, error, issues } = linting
  return {
    id: mapLintIdtoTaskId({ appId, modelId }),
    cluster,
    status: mapLintStatusToTaskStatus(status),
    data: {
      issues
    },
    input: dataset,
    progress: { start: 0, end: totalCount, current: currentCount },
    error: error && mapLintErrorToTaskError(error)
  }
}

export const mapTaskQueryToLintingQuery = (
  task: Partial<queues.Task<TrainInput, LintTaskData, LintTaskError>>
): Partial<Linting> => {
  const { id, status, cluster, progress, input, data, error } = task
  const { appId, modelId } = id ? mapTaskIdToLintId(id) : <Partial<LintingId>>{}
  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: status && mapTaskStatusToLintStatus(status),
      dataset: input,
      progress: progress?.current,
      error: error && mapTaskErrorToLintError(error)
    },
    (x) => x !== undefined
  )
}

export const mapTaskToLinting = (task: queues.Task<TrainInput, LintTaskData, LintTaskError>): Linting => {
  const { id, status, cluster, progress, input, data, error } = task
  const { issues } = data
  const { appId, modelId } = mapTaskIdToLintId(id)
  return {
    appId,
    modelId,
    cluster,
    status: mapTaskStatusToLintStatus(status),
    dataset: input,
    currentCount: progress.current,
    totalCount: progress.end,
    issues,
    error: error && mapTaskErrorToLintError(error)
  }
}
