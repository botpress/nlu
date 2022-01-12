import { Logger } from '@botpress/logger'
import { QueueOptions, LocalTaskQueue } from './local-queue'
import { Broadcaster, TaskHandler, TaskRepository, TaskRunner } from './typings'

export class DistributedTaskQueue<TaskInput, TaskData> extends LocalTaskQueue<TaskInput, TaskData> {
  private _broadcastCancelTask!: LocalTaskQueue<TaskInput, TaskData>['cancelTask']
  private _broadcastSchedulerInterrupt!: () => Promise<void>

  constructor(
    taskRepo: TaskRepository<TaskInput, TaskData>,
    clusterId: string,
    taskRunner: TaskRunner<TaskInput, TaskData>,
    taskCanceler: TaskHandler<TaskInput, TaskData>,
    logger: Logger,
    private _broadcast: Broadcaster,
    opt: Partial<QueueOptions<TaskData>> = {}
  ) {
    super(taskRepo, clusterId, taskRunner, taskCanceler, logger, opt)
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
}
