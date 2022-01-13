type _Override<T, K> = Omit<T, keyof K> & K
type _Func<X extends any[], Y extends any> = (...x: X) => Y

export type TaskTrx<TaskInput, TaskData> = (repo: WrittableTaskRepository<TaskInput, TaskData>) => Promise<void>

export type TaskHandler<TaskInput, TaskData> = (task: Task<TaskInput, TaskData>) => Promise<void>
export type ProgressCb = (progress: TaskProgress) => void

export type TaskRunner<TaskInput, TaskData> = (
  task: Task<TaskInput, TaskData>,
  progress: ProgressCb
) => Promise<TerminatedTask<TaskInput, TaskData>>

export type TaskErrorType = 'zombie-task' | 'internal'
export type TaskError = {
  type: TaskErrorType
  message: string
  stack?: string
}

export type TaskTerminatedStatus = 'done' | 'running' | 'errored'
export type TaskStatus = TaskTerminatedStatus | 'pending' | 'running'
export type TaskState = {
  status: TaskStatus
  cluster: string
  progress: TaskProgress
  error?: TaskError
}

export type Task<TaskInput, TaskData> = TaskState & { id: string; input: TaskInput; data: Partial<TaskData> }
export type TerminatedTask<TaskInput, TaskData> = _Override<Task<TaskInput, TaskData>, { status: TaskTerminatedStatus }>

export type ReadonlyTaskRepository<TaskInput, TaskData> = {
  addListener: (listener: TaskHandler<TaskInput, TaskData>) => void
  removeListener: (listener: TaskHandler<TaskInput, TaskData>) => void
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: string) => Promise<Task<TaskInput, TaskData> | undefined>
  has: (id: string) => Promise<boolean>
  query: (query: Partial<TaskState>) => Promise<Task<TaskInput, TaskData>[]>
  queryOlderThan: (query: Partial<TaskState>, threshold: Date) => Promise<Task<TaskInput, TaskData>[]>
  delete: (id: string) => Promise<void>
}

export type WrittableTaskRepository<TaskInput, TaskData> = ReadonlyTaskRepository<TaskInput, TaskData> & {
  set: (task: Task<TaskInput, TaskData>) => Promise<void>
}

export type TaskRepository<TaskInput, TaskData> = ReadonlyTaskRepository<TaskInput, TaskData> & {
  inTransaction: (trx: TaskTrx<TaskInput, TaskData>, name: string) => Promise<void>
}

export type TaskProgress = {
  start: number
  end: number
  current: number
}

export type Broadcaster = <X extends any[]>(
  name: string,
  f: _Func<X, Promise<void>>
) => Promise<_Func<X, Promise<void>>>

export class DistributedTaskQueue<TaskInput, TaskData> {
  public readonly taskRepo: TaskRepository<TaskInput, TaskData>
  constructor(
    taskRepo: TaskRepository<TaskInput, TaskData>,
    clusterId: string,
    taskRunner: TaskRunner<TaskInput, TaskData>,
    taskCanceler: TaskHandler<TaskInput, TaskData>,
    logger: Logger,
    opt: Partial<QueueOptions<TaskData>> = {}
  )
  public addListener(listener: TaskHandler<TaskInput, TaskData>): void
  public removeListener(listener: TaskHandler<TaskInput, TaskData>): void
  public initialize(): Promise<void>
  public teardown(): Promise<void>
  public getLocalTaskCount(): Promise<void>
  public queueTask(taskId: string, input: TaskInput): Promise<void>
  public cancelTask(taskId: string): Promise<void>
}
