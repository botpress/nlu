import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'

import { TaskAlreadyStartedError, TaskNotFoundError } from './errors'
import { createTimer, InterruptTimer } from './interrupt'
import {
  Task,
  TaskError,
  TaskHandler,
  TaskProgress,
  TaskRepository,
  TaskRunner,
  TaskState,
  TaskStatus,
  WrittableTaskRepository
} from './typings'

// TODO: make these configurable by options
const TASK_HEARTBEAT_SECURITY_FACTOR = 3
const MIN_TASK_HEARTBEAT = ms('10s')
const MAX_TASK_HEARTBEAT = MIN_TASK_HEARTBEAT * TASK_HEARTBEAT_SECURITY_FACTOR

export type QueueOptions<TaskData> = {
  maxTasks: number
  initialProgress: TaskProgress
  initialData: Partial<TaskData>
}

const DEFAULT_OPTIONS: QueueOptions<{}> = {
  maxTasks: 2,
  initialProgress: { start: 0, end: 100, current: 0 },
  initialData: {}
}

export class LocalTaskQueue<TaskInput, TaskData> {
  private _logger: Logger
  private _options: QueueOptions<TaskData>
  private _schedulingTimmer!: InterruptTimer<[]>

  constructor(
    private _taskRepo: TaskRepository<TaskInput, TaskData>,
    private _clusterId: string,
    private _taskRunner: TaskRunner<TaskInput, TaskData>,
    private _taskCanceler: TaskHandler<TaskInput, TaskData>,
    logger: Logger,
    opt: Partial<QueueOptions<TaskData>> = {}
  ) {
    this._logger = logger.sub('task-queue')
    this._options = { ...DEFAULT_OPTIONS, ...opt }
  }

  public addListener(listener: TaskHandler<TaskInput, TaskData>) {
    this._taskRepo.addListener(listener)
  }

  public removeListener(listener: TaskHandler<TaskInput, TaskData>) {
    this._taskRepo.removeListener(listener)
  }

  public async initialize() {
    this._schedulingTimmer = createTimer(this._runSchedulerInterrupt.bind(this), MAX_TASK_HEARTBEAT * 2)
  }

  public async teardown() {
    return this._schedulingTimmer.stop()
  }

  public getLocalTaskCount = async () => {
    const localTasks = await this._taskRepo.query({ cluster: this._clusterId, status: 'running' })
    return localTasks.length
  }

  public queueTask = async (taskId: string, input: TaskInput) => {
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

      this._logger.debug(`Queuing "${taskId}"`)
      return repo.set({
        ...state,
        id: taskId,
        input,
        data: this._options.initialData
      })
    }, 'queueTask')
    this._logger.info(`[${taskId}] Task Queued.`)

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
        return this._taskCanceler(currentTask)
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
        const error: TaskError = {
          type: 'zombie-task',
          message: `Zombie Task: Task had not been updated in more than ${MAX_TASK_HEARTBEAT} ms.`
        }
        const progress = this._options.initialProgress
        const newState: TaskState = { status: 'errored', cluster: this._clusterId, error, progress }
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

  private _runTask = async (task: Task<TaskInput, TaskData>) => {
    this._logger.debug(`task "${task.id}" is about to start.`)

    const progressCb = async (progress: TaskProgress) => {
      task.status = 'running'
      task.progress = progress
      await this._taskRepo.inTransaction(async (repo) => {
        return repo.set(task)
      }, 'progressCallback')
    }
    const throttledCb = _.throttle(progressCb, MIN_TASK_HEARTBEAT / 2)

    try {
      const terminatedTask = await this._taskRunner(task, throttledCb)

      throttledCb.flush()
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

  private _getZombies = (repo: WrittableTaskRepository<TaskInput, TaskData>) => {
    const zombieThreshold = moment().subtract(MAX_TASK_HEARTBEAT, 'ms').toDate()
    return repo.queryOlderThan({ status: 'running' }, zombieThreshold)
  }
}
