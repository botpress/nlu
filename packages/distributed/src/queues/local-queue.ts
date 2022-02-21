import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { InMemoryTransactionLocker } from '../locks'
import { TaskNotFoundError } from '.'
import { BaseTaskQueue } from './base-queue'

import { SafeTaskRepo } from './safe-repo'
import { TaskRunner, TaskRepository, QueueOptions, TaskQueue as ITaskQueue, TaskStatus } from './typings'

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
    const logCb = (msg: string) => logger.sub('local-task-queue').debug(msg)
    const safeRepo = new SafeTaskRepo(taskRepo, new InMemoryTransactionLocker(logCb))
    super(safeRepo, taskRunner, logger, idToString, opt)
  }

  public cancelTask(taskId: TId): Promise<void> {
    const taskKey = this._idToString(taskId)
    return this._taskRepo.inTransaction(async (repo) => {
      const currentTask = await repo.get(taskId)
      if (!currentTask) {
        throw new TaskNotFoundError(taskKey)
      }

      const zombieTasks = await this._getZombies(repo)
      const isZombie = !!zombieTasks.find((t) => this._idToString(t) === taskKey)

      if (currentTask.status === 'pending' || isZombie) {
        const newTask = { ...currentTask, status: <TaskStatus>'canceled' }
        return repo.set(newTask)
      }

      if (currentTask.status === 'running') {
        return this._taskRunner.cancel(currentTask)
      }
    }, 'cancelTask')
  }
}
