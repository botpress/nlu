import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'

import { LintingRepository } from '../../infrastructure'
import { LintingAlreadyStartedError, LintingNotFoundError } from '../errors'
import { LintHandler } from './lint-handler'
import { mapLintIdtoTaskId } from './lint-task-mapper'
import { LintTaskRepo } from './lint-task-repo'
import { LintTaskData, LintTaskError } from './typings'

export const MIN_LINTING_HEARTBEAT = ms('10s')
export const PROGRESS_THROTTLE = MIN_LINTING_HEARTBEAT / 2
export const MAX_LINTING_HEARTBEAT = MIN_LINTING_HEARTBEAT * 3

const TASK_OPTIONS: Partial<queues.QueueOptions<TrainInput, LintTaskData, LintTaskError>> = {
  maxProgressDelay: MAX_LINTING_HEARTBEAT,
  initialProgress: { start: 0, end: -1, current: 0 },
  initialData: { issues: [] }
}

export type LintQueueOptions = {
  maxLinting?: number
}

export abstract class LintingQueue {
  constructor(private taskQueue: queues.TaskQueue<TrainInput, LintTaskData, LintTaskError>, private logger: Logger) {}

  public initialize = this.taskQueue.initialize.bind(this.taskQueue)
  public teardown = this.taskQueue.teardown.bind(this.taskQueue)
  public getLocalLintingCount = this.taskQueue.getLocalTaskCount.bind(this.taskQueue)

  public queueLinting = async (appId: string, modelId: NLUEngine.ModelId, trainInput: TrainInput) => {
    try {
      const taskId = mapLintIdtoTaskId({ modelId, appId })
      await this.taskQueue.queueTask(taskId, trainInput)
      this.logger.info(`[${taskId}] Linting Queued.`)
    } catch (thrown) {
      if (thrown instanceof queues.TaskAlreadyStartedError) {
        throw new LintingAlreadyStartedError(appId, modelId)
      }
      throw thrown
    }
  }

  public async cancelLinting(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    try {
      const taskId = mapLintIdtoTaskId({ modelId, appId })
      await this.taskQueue.cancelTask(taskId)
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
    const taskQueue = new queues.PGDistributedTaskQueue(pgURL, lintTaskRepo, lintHandler, logger, {
      ...TASK_OPTIONS,
      maxTasks: opt.maxLinting
    })
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
    const taskQueue = new queues.LocalTaskQueue(lintTaskRepo, lintHandler, logger, {
      ...TASK_OPTIONS,
      maxTasks: opt.maxLinting
    })
    super(taskQueue, logger)
  }
}
