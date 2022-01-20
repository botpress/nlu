import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { InMemoryTransactionLocker } from '../locks'
import { BaseTaskQueue } from './base-queue'

import { SafeTaskRepo } from './safe-repo'
import { TaskRunner, TaskRepository, QueueOptions, TaskQueue as ITaskQueue } from './typings'

export class LocalTaskQueue<TId, TInput, TData, TError>
  extends BaseTaskQueue<TId, TInput, TData, TError>
  implements ITaskQueue<TId, TInput, TData, TError> {
  constructor(
    taskRepo: TaskRepository<TId, TInput, TData, TError>,
    taskRunner: TaskRunner<TId, TInput, TData, TError>,
    logger: Logger,
    idToString: (id: TId) => string,
    opt: QueueOptions<TId, TInput, TData, TError>
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    const safeRepo = new SafeTaskRepo(taskRepo, new InMemoryTransactionLocker(logCb))
    super(safeRepo, taskRunner, logger, idToString, opt)
  }
}
