import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import { nanoid } from 'nanoid'

import { TaskAlreadyStartedError } from './errors'
import { createTimer, InterruptTimer } from './interrupt'
import {
  Task,
  TaskProgress,
  SafeTaskRepository,
  TaskRunner,
  TaskState,
  TaskStatus,
  TaskRepository,
  QueueOptions,
  TaskQueue as ITaskQueue
} from './typings'

export abstract class BaseTaskQueue<TId, TInput, TData, TError> implements ITaskQueue<TId, TInput, TData, TError> {
  private _schedulingTimmer!: InterruptTimer<[]>
  protected _clusterId: string = nanoid()

  constructor(
    protected _taskRepo: SafeTaskRepository<TId, TInput, TData, TError>,
    protected _taskRunner: TaskRunner<TId, TInput, TData, TError>,
    protected _logger: Logger,
    protected _idToString: (id: TId) => string,
    protected _options: QueueOptions<TId, TInput, TData, TError>
  ) {}

  public async initialize() {
    await this._taskRepo.initialize()
    this._schedulingTimmer = createTimer(this._runSchedulerInterrupt.bind(this), this._options.maxProgressDelay * 2)
  }

  public async teardown() {
    await this._taskRepo.teardown()
    return this._schedulingTimmer.stop()
  }

  public getLocalTaskCount = async () => {
    const localTasks = await this._taskRepo.query({ cluster: this._clusterId, status: 'running' })
    return localTasks.length
  }

  public queueTask = async (taskId: TId, input: TInput) => {
    const taskKey = this._idToString(taskId)
    await this._taskRepo.inTransaction(async (repo) => {
      const currentTask = await repo.get(taskId)
      if (currentTask && (currentTask.status === 'running' || currentTask.status === 'pending')) {
        throw new TaskAlreadyStartedError(taskKey)
      }

      const state: TaskState<TId, TInput, TData, TError> = {
        status: 'pending',
        cluster: this._clusterId,
        progress: this._options.initialProgress,
        input,
        data: this._options.initialData
      }

      return repo.set({ ...state, ...taskId })
    }, 'queueTask')

    // to return asap from queuing
    void this.runSchedulerInterrupt()
  }

  public abstract cancelTask(taskId: TId): Promise<void>

  protected async runSchedulerInterrupt() {
    try {
      return this._schedulingTimmer.run()
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.attachError(err).error('An error occured when running scheduler interrupt.')
    }
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

        const progress = this._options.initialProgress
        const newState = { status: <TaskStatus>'zombie', cluster: this._clusterId, progress }
        await Bluebird.each(zombieTasks, (z) => repo.set({ ...z, ...newState }))
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

  private _runTask = async (task: Task<TId, TInput, TData, TError>) => {
    const taskKey = this._idToString(task)
    this._logger.debug(`task "${taskKey}" is about to start.`)

    const updateTask = _.throttle(async () => {
      await this._taskRepo.inTransaction(async (repo) => {
        return repo.set(task)
      }, 'progressCallback')
    }, this._options.progressThrottle)

    try {
      const terminatedTask = await this._taskRunner.run(task, async (progress: TaskProgress, data?: TData) => {
        task.status = 'running'
        task.progress = progress
        if (data) {
          task.data = data
        }
        void updateTask()
      })

      updateTask.flush()

      if (terminatedTask) {
        await this._taskRepo.inTransaction(async (repo) => {
          return repo.set(terminatedTask)
        }, '_task_terminated')
      }
    } catch (thrown) {
      updateTask.flush()

      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.attachError(err).error(`Unhandled error when running task "${taskKey}"`)
    } finally {
      // to return asap
      void this.runSchedulerInterrupt()
    }
  }

  protected _getZombies = (repo: TaskRepository<TId, TInput, TData, TError>) => {
    const zombieThreshold = moment().subtract(this._options.maxProgressDelay, 'ms').toDate()
    return repo.queryOlderThan({ status: 'running' }, zombieThreshold)
  }
}
