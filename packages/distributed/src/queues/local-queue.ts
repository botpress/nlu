import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { InMemoryTransactionLocker } from '../locks'
import { BaseTaskQueue, QueueOptions } from './base-queue'

import { SafeTaskRepo } from './safe-repo'
import { TaskHandler, TaskRunner, TaskRepository } from './typings'

export class LocalTaskQueue<TaskInput, TaskData> extends BaseTaskQueue<TaskInput, TaskData> {
  constructor(
    taskRepo: TaskRepository<TaskInput, TaskData>,
    taskRunner: TaskRunner<TaskInput, TaskData>,
    taskCanceler: TaskHandler<TaskInput, TaskData>,
    logger: Logger,
    opt: Partial<QueueOptions<TaskData>> = {}
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    const safeRepo = new SafeTaskRepo(taskRepo, new InMemoryTransactionLocker(logCb))
    super(safeRepo, taskRunner, taskCanceler, logger, opt)
  }
}
