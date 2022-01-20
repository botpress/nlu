import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'

import { LintingId, LintingRepository } from '../../infrastructure'
import { LintingAlreadyStartedError, LintingNotFoundError } from '../errors'
import { LintHandler } from './lint-handler'
import { LintIdUtil } from './lint-id-utils'
import { LintTaskRepo } from './lint-task-repo'
import { LintTaskQueue, LintTaskQueueOptions } from './typings'

export const MIN_LINTING_HEARTBEAT = ms('10s')

const TASK_OPTIONS: LintTaskQueueOptions = {
  initialProgress: { start: 0, end: -1, current: 0 },
  initialData: { issues: [] },
  maxTasks: 2,
  maxProgressDelay: MIN_LINTING_HEARTBEAT * 3,
  progressThrottle: MIN_LINTING_HEARTBEAT / 2
}

export type LintQueueOptions = {
  maxLinting?: number
}

export abstract class LintingQueue {
  constructor(private taskQueue: LintTaskQueue, private logger: Logger) {}

  public initialize = this.taskQueue.initialize.bind(this.taskQueue)
  public teardown = this.taskQueue.teardown.bind(this.taskQueue)
  public getLocalLintingCount = this.taskQueue.getLocalTaskCount.bind(this.taskQueue)

  public queueLinting = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    try {
      const lintId: LintingId = { appId, modelId }
      const lintKey = LintIdUtil.toString(lintId)
      await this.taskQueue.queueTask(lintId, trainInput)
      this.logger.info(`[${lintKey}] Linting Queued.`)
    } catch (thrown) {
      if (thrown instanceof queues.TaskAlreadyStartedError) {
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
      if (thrown instanceof queues.TaskNotFoundError) {
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
    logger: Logger,
    opt: LintQueueOptions = {}
  ) {
    const lintTaskRepo = new LintTaskRepo(lintingRepo)
    const lintHandler = new LintHandler(engine, logger.sub('linting-queue'))
    const options = opt.maxLinting
      ? {
          ...TASK_OPTIONS,
          maxTasks: opt.maxLinting
        }
      : TASK_OPTIONS

    const taskQueue = new queues.PGDistributedTaskQueue(pgURL, lintTaskRepo, lintHandler, logger, LintIdUtil, options)
    super(taskQueue, logger)
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
    const logger = baseLogger.sub('linting-queue')
    const lintHandler = new LintHandler(engine, logger)

    const options = opt.maxLinting
      ? {
          ...TASK_OPTIONS,
          maxTasks: opt.maxLinting
        }
      : TASK_OPTIONS

    const taskQueue = new queues.LocalTaskQueue(lintTaskRepo, lintHandler, logger, LintIdUtil, options)
    super(taskQueue, logger)
  }
}
