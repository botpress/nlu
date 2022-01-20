import { queues } from '@botpress/distributed'
import { LintingStatus } from '@botpress/nlu-client'
import _ from 'lodash'
import { Linting } from '../../infrastructure'
import { LintTask } from './typings'

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
  if (taskStatus === 'errored' || taskStatus === 'zombie') {
    // TODO: do not forget to create error
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

export const mapLintingToTask = (linting: Linting): LintTask => {
  const { appId, modelId, status, cluster, currentCount, totalCount, dataset, error, issues } = linting
  return {
    appId,
    modelId,
    cluster,
    status: mapLintStatusToTaskStatus(status),
    data: {
      issues
    },
    input: dataset,
    progress: { start: 0, end: totalCount, current: currentCount },
    error
  }
}

export const mapTaskQueryToLintingQuery = (task: Partial<LintTask>): Partial<Linting> => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: status && mapTaskStatusToLintStatus(status),
      dataset: input,
      progress: progress?.current,
      error,
      issues: data?.issues
    },
    (x) => x !== undefined
  )
}

export const mapTaskToLinting = (task: LintTask): Linting => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  const { issues } = data
  return {
    appId,
    modelId,
    cluster,
    status: mapTaskStatusToLintStatus(status),
    dataset: input,
    currentCount: progress.current,
    totalCount: progress.end,
    issues,
    error
  }
}
