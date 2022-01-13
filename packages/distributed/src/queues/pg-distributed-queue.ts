import { Logger } from '@botpress/logger'
import PGPubSub from 'pg-pubsub'
import { PGTransactionLocker } from '../locks'
import { BaseTaskQueue, QueueOptions } from './base-queue'
import { LocalTaskQueue } from './local-queue'
import { SafeTaskRepo } from './safe-repo'
import { TaskHandler, TaskRunner, TaskRepository } from './typings'

type Func<X extends any[], Y extends any> = (...x: X) => Y

export class PGDistributedTaskQueue<TaskInput, TaskData> extends BaseTaskQueue<TaskInput, TaskData> {
  private _pubsub: PGPubSub

  private _broadcastCancelTask!: LocalTaskQueue<TaskInput, TaskData>['cancelTask']
  private _broadcastSchedulerInterrupt!: () => Promise<void>

  constructor(
    pgURL: string,
    taskRepo: TaskRepository<TaskInput, TaskData>,
    taskRunner: TaskRunner<TaskInput, TaskData>,
    taskCanceler: TaskHandler<TaskInput, TaskData>,
    logger: Logger,
    opt: Partial<QueueOptions<TaskData>> = {}
  ) {
    super(PGDistributedTaskQueue._makeSafeRepo(pgURL, taskRepo, logger), taskRunner, taskCanceler, logger, opt)
    this._pubsub = new PGPubSub(pgURL, {
      log: () => {}
    })
  }

  private static _makeSafeRepo<TaskInput, TaskData>(
    pgURL: string,
    taskRepo: TaskRepository<TaskInput, TaskData>,
    logger: Logger
  ) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    return new SafeTaskRepo(taskRepo, new PGTransactionLocker(pgURL, logCb))
  }

  public async initialize() {
    await super.initialize()

    this._broadcastCancelTask = await this._broadcast<[string]>('cancel_task', super.cancelTask.bind(this))
    this._broadcastSchedulerInterrupt = await this._broadcast<[]>(
      'scheduler_interrupt',
      super.runSchedulerInterrupt.bind(this)
    )
  }

  // for if a different instance gets the cancel task http call
  public cancelTask(taskId: string) {
    return this._broadcastCancelTask(taskId)
  }

  // for if an completly busy instance receives a queue task http call
  protected runSchedulerInterrupt() {
    return this._broadcastSchedulerInterrupt()
  }

  private _broadcast = async <X extends any[]>(name: string, fn: Func<X, Promise<void>>) => {
    await this._pubsub.addChannel(name, (x) => fn(...x))
    return (...x: X) => this._pubsub.publish(name, x)
  }
}
