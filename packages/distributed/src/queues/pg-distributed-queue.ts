import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import ms from 'ms'
import PGPubSub from 'pg-pubsub'
import { PGTransactionLocker } from '../locks'
import { TaskNotFoundError } from '.'
import { BaseTaskQueue } from './base-queue'
import { TaskNotRunning } from './errors'
import { PGQueueEventObserver } from './pg-event-observer'
import { SafeTaskRepo } from './safe-repo'
import { TaskRunner, TaskRepository, QueueOptions, TaskQueue as ITaskQueue, TaskStatus } from './typings'

const DISTRIBUTED_CANCEL_TIMEOUT_DELAY = ms('2s')

export class PGDistributedTaskQueue<TId, TInput, TData, TError>
  extends BaseTaskQueue<TId, TInput, TData, TError>
  implements ITaskQueue<TId, TInput, TData, TError> {
  private _obs: PGQueueEventObserver<TId, TInput, TData, TError>

  constructor(
    pgURL: string,
    taskRepo: TaskRepository<TId, TInput, TData, TError>,
    taskRunner: TaskRunner<TId, TInput, TData, TError>,
    logger: Logger,
    idToString: (id: TId) => string,
    opt: QueueOptions<TId, TInput, TData, TError>
  ) {
    super(PGDistributedTaskQueue._makeSafeRepo(pgURL, taskRepo, logger), taskRunner, logger, idToString, opt)
    const _pubsub = new PGPubSub(pgURL, { log: () => {} })
    this._obs = new PGQueueEventObserver(_pubsub, opt.queueId)
  }

  private static _makeSafeRepo<TId, TInput, TData, TError>(
    pgURL: string,
    taskRepo: TaskRepository<TId, TInput, TData, TError>,
    logger: Logger
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    return new SafeTaskRepo(taskRepo, new PGTransactionLocker(pgURL, logCb))
  }

  public async initialize() {
    await super.initialize()
    await this._obs.initialize()
    this._obs.on('run_scheduler_interrupt', super.runSchedulerInterrupt.bind(this))
    this._obs.on('cancel_task', ({ taskId, clusterId }) => this._handleCancelTaskEvent(taskId, clusterId))
  }

  public async cancelTask(taskId: TId) {
    const taskKey = this._idToString(taskId)

    return this._taskRepo.inTransaction(async (repo) => {
      await this._queueBackZombies(repo)

      const currentTask = await this._taskRepo.get(taskId)
      if (!currentTask) {
        throw new TaskNotFoundError(taskKey)
      }
      if (!this._isCancelable(currentTask)) {
        throw new TaskNotRunning(taskKey)
      }

      if (currentTask.status === 'pending' || currentTask.status === 'zombie') {
        const newTask = { ...currentTask, status: <TaskStatus>'canceled' }
        return repo.set(newTask)
      }

      if (currentTask.cluster === this._clusterId) {
        return this._taskRunner.cancel(currentTask)
      }

      this._logger.debug(`Task "${taskId}" was not launched on this instance`)
      await Bluebird.race([
        this._cancelAndWaitForResponse(taskId, currentTask.cluster),
        this._timeoutTaskCancelation(DISTRIBUTED_CANCEL_TIMEOUT_DELAY)
      ])
    }, 'cancelTask')
  }

  private _cancelAndWaitForResponse = (taskId: TId, clusterId: string): Promise<void> =>
    new Promise(async (resolve, reject) => {
      this._obs.onceOrMore('cancel_task_done', async (response) => {
        console.log(
          `############## ${new Date().toISOString()} [${
            this._clusterId
          }] Receiving cancel_task_done #########################`
        )
        console.log(this._idToString(response.taskId), this._idToString(taskId))
        if (this._idToString(response.taskId) !== this._idToString(taskId)) {
          return 'stay' // canceled task is not the one we're waiting for
        }

        if (response.err) {
          const { message, stack } = response.err
          const err = new Error(message)
          err.stack = stack
          reject(err)
          return 'leave'
        }

        resolve()
        return 'leave'
      })
      console.log(
        `############## ${new Date().toISOString()} [${
          this._clusterId
        }] Sending cancel_task ################################`
      )
      await this._obs.emit('cancel_task', { taskId, clusterId })
    })

  private _timeoutTaskCancelation = (ms: number): Promise<never> =>
    new Promise((_resolve, reject) => {
      console.log(
        `############## ${new Date().toISOString()} [${
          this._clusterId
        }] Start Timer ########################################`
      )
      setTimeout(() => {
        console.log(
          `############## ${new Date().toISOString()} [${
            this._clusterId
          }] Stop Timer #########################################`
        )
        reject(new Error(`Canceling operation took more than ${ms} ms`))
      }, ms)
    })

  private _handleCancelTaskEvent = async (taskId: TId, clusterId: string) => {
    if (clusterId !== this._clusterId) {
      return // message was not adressed to this instance
    }

    console.log(
      `############## ${new Date().toISOString()} [${
        this._clusterId
      }] Receiving cancel_task ##############################`
    )

    try {
      await this._taskRunner.cancel(taskId)

      console.log(
        `############## ${new Date().toISOString()} [${
          this._clusterId
        }] Sending cancel_task_done with success ##############`
      )
      await this._obs.emit('cancel_task_done', { taskId })
    } catch (thrown) {
      const { message, stack } = thrown instanceof Error ? thrown : new Error(`${thrown}`)

      console.log(
        `############## ${new Date().toISOString()} [${
          this._clusterId
        }] Sending cancel_task_done with error ################`
      )
      await this._obs.emit('cancel_task_done', { taskId, err: { message, stack } })
    }
  }

  // for if an completly busy instance receives a queue task http call
  protected runSchedulerInterrupt() {
    return this._obs.emit('run_scheduler_interrupt', undefined)
  }
}
