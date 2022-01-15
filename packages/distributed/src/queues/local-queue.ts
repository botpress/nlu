import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { InMemoryTransactionLocker } from '../locks'
import { BaseTaskQueue } from './base-queue'

import { SafeTaskRepo } from './safe-repo'
import { TaskRunner, TaskRepository, QueueOptions, TaskQueue as ITaskQueue } from './typings'

export class LocalTaskQueue<TInput, TData, TError>
  extends BaseTaskQueue<TInput, TData, TError>
  implements ITaskQueue<TInput, TData, TError> {
  constructor(
    taskRepo: TaskRepository<TInput, TData, TError>,
    taskRunner: TaskRunner<TInput, TData, TError>,
    logger: Logger,
    opt: Partial<QueueOptions<TInput, TData, TError>> = {}
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    const safeRepo = new SafeTaskRepo(taskRepo, new InMemoryTransactionLocker(logCb))
    super(safeRepo, taskRunner, logger, opt)
  }
}
