import * as q from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'

import { LintingId, LintingRepository } from '../../infrastructure'
import { LintingAlreadyStartedError, LintingNotFoundError } from '../errors'
import { LintHandler } from './lint-handler'
import { LintTaskRepo } from './lint-task-repo'
import { LintTaskQueue, LintTaskQueueOptions } from './typings'

export const MIN_LINTING_HEARTBEAT = ms('10s')
export const MAX_LINTING_HEARTBEAT = MIN_LINTING_HEARTBEAT * 3
export const LINTING_PROGRESS_THROTTLE = MIN_LINTING_HEARTBEAT / 2

const TASK_OPTIONS: LintTaskQueueOptions = {
  queueId: 'linting',
  initialProgress: { start: 0, end: -1, current: 0 },
  initialData: { issues: [] },
  maxTasks: 2,
  maxProgressDelay: MAX_LINTING_HEARTBEAT,
  progressThrottle: LINTING_PROGRESS_THROTTLE
}

const LINTING_PREFIX = 'linting-queue'

export type LintQueueOptions = {
  maxLinting?: number
}

const idToString = (id: LintingId) => {
  const { appId, modelId } = id
  const stringModelId = NLUEngine.modelIdService.toString(modelId)
  return `${appId}/${stringModelId}`
}

export abstract class LintingQueue {
  constructor(private taskQueue: LintTaskQueue, private logger: Logger) {}

  public initialize = this.taskQueue.initialize.bind(this.taskQueue)
  public teardown = this.taskQueue.teardown.bind(this.taskQueue)
  public getLocalLintingCount = this.taskQueue.getLocalTaskCount.bind(this.taskQueue)

  public queueLinting = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    try {
      const lintId: LintingId = { appId, modelId }
      const lintKey = idToString(lintId)
      await this.taskQueue.queueTask(lintId, trainInput)
      this.logger.info(`[${lintKey}] Linting Queued.`)
    } catch (thrown) {
      if (thrown instanceof q.TaskAlreadyStartedError) {
        throw new LintingAlreadyStartedError(appId, modelId)
      }
      throw thrown
    }
  }

  public async cancelLinting(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    try {
      const lintId: LintingId = { appId, modelId }
      await this.taskQueue.cancelTask(lintId)
    } catch (thrown) {
      if (thrown instanceof q.TaskNotFoundError) {
        throw new LintingNotFoundError(appId, modelId)
      }
      throw thrown
    }
  }
}

export class PgLintingQueue extends LintingQueue {
  constructor(
    pgURL: string,
    lintingRepo: LintingRepository,
    engine: NLUEngine.Engine,
    baseLogger: Logger,
    opt: LintQueueOptions = {}
  ) {
    const lintingLoger = baseLogger.sub(LINTING_PREFIX)
    const lintTaskRepo = new LintTaskRepo(lintingRepo)
    const lintHandler = new LintHandler(engine, lintingLoger)
    const options = opt.maxLinting
      ? {
          ...TASK_OPTIONS,
          maxTasks: opt.maxLinting
        }
      : TASK_OPTIONS

    const taskQueue = new q.PGDistributedTaskQueue(pgURL, lintTaskRepo, lintHandler, lintingLoger, idToString, options)
    super(taskQueue, lintingLoger)
  }
}

export class LocalLintingQueue extends LintingQueue {
  constructor(
    lintingRepo: LintingRepository,
    engine: NLUEngine.Engine,
    baseLogger: Logger,
    opt: LintQueueOptions = {}
  ) {
    const lintTaskRepo = new LintTaskRepo(lintingRepo)
    const lintingLogger = baseLogger.sub(LINTING_PREFIX)
    const lintHandler = new LintHandler(engine, lintingLogger)

    const options =
      opt.maxLinting === undefined
        ? TASK_OPTIONS
        : {
            ...TASK_OPTIONS,
            maxTasks: opt.maxLinting
          }

    const taskQueue = new q.LocalTaskQueue(lintTaskRepo, lintHandler, lintingLogger, idToString, options)
    super(taskQueue, lintingLogger)
  }
}
