export type TaskTrx<TaskInput, TaskData> = (repo: TaskRepository<TaskInput, TaskData>) => Promise<void>

export type TaskHandler<TaskInput, TaskData> = (task: Task<TaskInput, TaskData>) => Promise<void>
export type ProgressCb = (progress: TaskProgress) => void

export type TaskRunner<TaskInput, TaskData> = {
  run: (task: Task<TaskInput, TaskData>, progress: ProgressCb) => Promise<TerminatedTask<TaskInput, TaskData>>
  cancel: (task: Task<TaskInput, TaskData>) => Promise<void>
}

export type TaskErrorType = 'zombie-task' | 'internal'
export type TaskError = {
  type: TaskErrorType
  message: string
  stack?: string
}

export type TaskTerminatedStatus = 'done' | 'canceled' | 'errored'
export type TaskStatus = TaskTerminatedStatus | 'pending' | 'running'
export type TaskState = {
  status: TaskStatus
  cluster: string
  progress: TaskProgress
  error?: TaskError
}

export type Task<TaskInput, TaskData> = TaskState & { id: string; input: TaskInput; data: Partial<TaskData> }

type Override<T, K> = Omit<T, keyof K> & K
export type TerminatedTask<TaskInput, TaskData> = Override<Task<TaskInput, TaskData>, { status: TaskTerminatedStatus }>

export type ReadonlyTaskRepository<TaskInput, TaskData> = {
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: string) => Promise<Task<TaskInput, TaskData> | undefined>
  has: (id: string) => Promise<boolean>
  query: (query: Partial<TaskState>) => Promise<Task<TaskInput, TaskData>[]>
  queryOlderThan: (query: Partial<TaskState>, threshold: Date) => Promise<Task<TaskInput, TaskData>[]>
}

export type TaskRepository<TaskInput, TaskData> = ReadonlyTaskRepository<TaskInput, TaskData> & {
  set: (task: Task<TaskInput, TaskData>) => Promise<void>
}

export type SafeTaskRepository<TaskInput, TaskData> = ReadonlyTaskRepository<TaskInput, TaskData> & {
  inTransaction: (trx: TaskTrx<TaskInput, TaskData>, name: string) => Promise<void>
}

export type TaskProgress = {
  start: number
  end: number
  current: number
}

export type QueueOptions<_TaskInput, TaskData> = {
  maxTasks: number
  initialProgress: TaskProgress
  initialData: Partial<TaskData>
  maxProgressDelay: number
  progressThrottle: number
}

export type TaskQueue<TaskInput, _TaskData> = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getLocalTaskCount(): Promise<number>
  queueTask(taskId: string, input: TaskInput): Promise<void>
  cancelTask(taskId: string): Promise<void>
}
