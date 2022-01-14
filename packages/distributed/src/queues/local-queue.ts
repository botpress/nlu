import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { InMemoryTransactionLocker } from '../locks'
import { BaseTaskQueue } from './base-queue'

import { SafeTaskRepo } from './safe-repo'
import { TaskRunner, TaskRepository, QueueOptions } from './typings'

export class LocalTaskQueue<TaskInput, TaskData> extends BaseTaskQueue<TaskInput, TaskData> {
  constructor(
    taskRepo: TaskRepository<TaskInput, TaskData>,
    taskRunner: TaskRunner<TaskInput, TaskData>,
    logger: Logger,
    opt: Partial<QueueOptions<TaskInput, TaskData>> = {}
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    const safeRepo = new SafeTaskRepo(taskRepo, new InMemoryTransactionLocker(logCb))
    super(safeRepo, taskRunner, logger, opt)
  }
}
