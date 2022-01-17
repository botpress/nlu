import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { nanoid } from 'nanoid'

import { TaskAlreadyStartedError, TaskNotFoundError } from './errors'
import { createTimer, InterruptTimer } from './interrupt'
import {
  Task,
  TaskError,
  TaskProgress,
  SafeTaskRepository,
  TaskRunner,
  TaskState,
  TaskStatus,
  TaskRepository,
  QueueOptions,
  TaskQueue as ITaskQueue
} from './typings'

const DEFAULT_OPTIONS: QueueOptions<any, any, any> = {
  maxTasks: 2,
  initialProgress: { start: 0, end: 100, current: 0 },
  initialData: {},
  maxProgressDelay: ms('30s')
}

export class BaseTaskQueue<TInput, TData, TError> implements ITaskQueue<TInput, TData, TError> {
  private _logger: Logger
  private _options: QueueOptions<TInput, TData, TError>
  private _schedulingTimmer!: InterruptTimer<[]>
  protected _clusterId: string = nanoid()

  constructor(
    protected _taskRepo: SafeTaskRepository<TInput, TData, TError>,
    private _taskRunner: TaskRunner<TInput, TData, TError>,
    logger: Logger,
    opt: Partial<QueueOptions<TInput, TData, TError>> = {}
  ) {
    this._logger = logger.sub('task-queue')
    this._options = { ...DEFAULT_OPTIONS, ...opt }
  }

  public async initialize() {
    this._schedulingTimmer = createTimer(this._runSchedulerInterrupt.bind(this), this._options.maxProgressDelay * 2)
  }

  public async teardown() {
    return this._schedulingTimmer.stop()
  }

  public getLocalTaskCount = async () => {
    const localTasks = await this._taskRepo.query({ cluster: this._clusterId, status: 'running' })
    return localTasks.length
  }

  public queueTask = async (taskId: string, input: TInput) => {
    await this._taskRepo.inTransaction(async (repo) => {
      const currentTask = await repo.get(taskId)
      if (currentTask && (currentTask.status === 'running' || currentTask.status === 'pending')) {
        throw new TaskAlreadyStartedError(taskId)
      }

      const state: TaskState = {
        status: 'pending',
        cluster: this._clusterId,
        progress: this._options.initialProgress
      }

      return repo.set({
        ...state,
        id: taskId,
        input,
        data: this._options.initialData
      })
    }, 'queueTask')

    // to return asap from queuing
    void this.runSchedulerInterrupt()
  }

  public async cancelTask(taskId: string): Promise<void> {
    return this._taskRepo.inTransaction(async (repo) => {
      const currentTask = await repo.get(taskId)
      if (!currentTask) {
        throw new TaskNotFoundError(taskId)
      }

      const zombieTasks = await this._getZombies(repo)
      const isZombie = !!zombieTasks.find((t) => t.id === taskId)

      if (currentTask.status === 'pending' || isZombie) {
        const newTask = { ...currentTask, status: <TaskStatus>'canceled' }
        return repo.set(newTask)
      }

      if (currentTask.cluster !== this._clusterId) {
        this._logger.debug(`Task "${taskId}" was not launched on this instance`)
        return
      }

      if (currentTask.status === 'running') {
        return this._taskRunner.cancel(currentTask)
      }
    }, 'cancelTask')
  }

  protected async runSchedulerInterrupt() {
    return this._schedulingTimmer.run()
  }

  private _runSchedulerInterrupt = async () => {
    return this._taskRepo.inTransaction(async (repo) => {
      const localTasks = await repo.query({ cluster: this._clusterId, status: 'running' })
      if (localTasks.length >= this._options.maxTasks) {
        return
      }

      const zombieTasks = await this._getZombies(repo)
      if (zombieTasks.length) {
        this._logger.debug(`Queuing back ${zombieTasks.length} tasks because they seem to be zombies.`)

        const error: TaskError<TData, TInput, TError> = {
          type: 'zombie-task',
          message: `Zombie Task: Task had not been updated in more than ${this._options.maxProgressDelay} ms.`
        }

        const progress = this._options.initialProgress
        const newState: TaskState = { status: 'errored', cluster: this._clusterId, progress }
        await Bluebird.each(zombieTasks, (z) => repo.set({ ...z, ...newState, error }))
      }

      const pendings = await repo.query({ status: 'pending' })
      if (pendings.length <= 0) {
        return
      }

      const task = pendings[0]
      task.status = 'running'

      await repo.set(task)

      // floating promise to return fast from scheduler interrupt
      void this._runTask(task)
    }, '_runSchedulerInterrupt')
  }

  private _runTask = async (task: Task<TInput, TData, TError>) => {
    this._logger.debug(`task "${task.id}" is about to start.`)

    const progressCb = async (progress: TaskProgress, data?: TData) => {
      task.status = 'running'
      task.progress = progress
      if (data) {
        task.data = data
      }
      await this._taskRepo.inTransaction(async (repo) => {
        return repo.set(task)
      }, 'progressCallback')
    }

    try {
      const terminatedTask = await this._taskRunner.run(task, progressCb)

      await this._taskRepo.inTransaction(async (repo) => {
        return repo.set(terminatedTask)
      }, '_task_terminated')
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.attachError(err).error(`Unhandled error when running task "${task.id}"`)
    } finally {
      // to return asap
      void this.runSchedulerInterrupt()
    }
  }

  private _getZombies = (repo: TaskRepository<TInput, TData, TError>) => {
    const zombieThreshold = moment().subtract(this._options.maxProgressDelay, 'ms').toDate()
    return repo.queryOlderThan({ status: 'running' }, zombieThreshold)
  }
}
