import * as q from '@botpress/distributed'
import { LintingError, LintingStatus } from '@botpress/nlu-client'
import _ from 'lodash'
import { Linting, LintingId, LintingRepository } from '../../infrastructure'
import { MAX_LINTING_HEARTBEAT } from '.'
import { LintTask, LintTaskRepository } from './typings'

const zombieError: LintingError = {
  type: 'zombie-linting',
  message: `Zombie Linting: Linting has not been updated in more than ${MAX_LINTING_HEARTBEAT} ms.`
}

const mapLintStatusToTaskStatus = (lintStatus: LintingStatus): q.TaskStatus => {
  if (lintStatus === 'linting') {
    return 'running'
  }
  if (lintStatus === 'linting-pending') {
    return 'pending'
  }
  return lintStatus
}

const mapTaskStatusToLintStatus = (taskStatus: Exclude<q.TaskStatus, 'zombie'>): LintingStatus => {
  if (taskStatus === 'running') {
    return 'linting'
  }
  if (taskStatus === 'pending') {
    return 'linting-pending'
  }
  return taskStatus
}

const mapLintingToTask = (linting: Linting): LintTask => {
  const { appId, modelId, status, cluster, currentCount, totalCount, dataset, error, issues } = linting
  const isZombie = error?.type === 'zombie-linting'
  return {
    appId,
    modelId,
    cluster,
    status: isZombie ? 'zombie' : mapLintStatusToTaskStatus(status),
    data: {
      issues
    },
    input: dataset,
    progress: { start: 0, end: totalCount, current: currentCount },
    error: isZombie ? undefined : error
  }
}

const mapTaskToLinting = (task: LintTask): Linting => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  const { issues } = data
  const isZombie = status === 'zombie'
  return {
    appId,
    modelId,
    cluster,
    status: isZombie ? 'errored' : mapTaskStatusToLintStatus(status),
    dataset: input,
    currentCount: progress.current,
    totalCount: progress.end,
    issues,
    error: isZombie ? zombieError : error
  }
}

const mapTaskQueryToLintingQuery = (task: Partial<LintTask>): Partial<Linting> => {
  const { appId, modelId, status, cluster, progress, input, data, error } = task
  const isZombie = status === 'zombie'
  return _.pickBy(
    {
      appId,
      modelId,
      cluster,
      status: isZombie ? 'errored' : status && mapTaskStatusToLintStatus(status),
      dataset: input,
      progress: progress?.current,
      issues: data?.issues,
      error: isZombie ? zombieError : error
    },
    (x) => x !== undefined
  )
}

export class LintTaskRepo implements LintTaskRepository {
  constructor(private _lintRepo: LintingRepository) {}
  public initialize = this._lintRepo.initialize
  public teardown = this._lintRepo.teardown
  public has = this._lintRepo.has.bind(this._lintRepo)

  public async get(lintId: LintingId): Promise<LintTask | undefined> {
    const linting = await this._lintRepo.get(lintId)
    return linting && mapLintingToTask(linting)
  }

  public async query(taskQuery: Partial<LintTask>): Promise<LintTask[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.query(lintQuery)
    return lintings.map(mapLintingToTask)
  }

  public async queryOlderThan(taskQuery: Partial<LintTask>, threshold: Date): Promise<LintTask[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.queryOlderThan(lintQuery, threshold)
    return lintings.map(mapLintingToTask)
  }

  public async set(task: LintTask): Promise<void> {
    const linting = mapTaskToLinting(task)
    return this._lintRepo.set(linting)
  }
}
