export type TaskTrx<TId, TInput, TData, TError> = (repo: TaskRepository<TId, TInput, TData, TError>) => Promise<void>

export type TaskHandler<TId, TInput, TData, TError> = (task: Task<TId, TInput, TData, TError>) => Promise<void>
export type ProgressCb<_TId, _TInput, TData, _TError> = (progress: TaskProgress, data?: TData) => void

export type TaskRunner<TId, TInput, TData, TError> = {
  run: (
    task: Task<TId, TInput, TData, TError>,
    progress: ProgressCb<TId, TInput, TData, TError>
  ) => Promise<TerminatedTask<TId, TInput, TData, TError> | undefined>
  cancel: (task: Task<TId, TInput, TData, TError>) => Promise<void>
}

export type TaskTerminatedStatus = 'done' | 'canceled' | 'errored'
export type TaskStatus = TaskTerminatedStatus | 'pending' | 'running' | 'zombie'
export type TaskState<_TId, TInput, TData, TError> = {
  status: TaskStatus
  cluster: string
  progress: TaskProgress
  input: TInput
  data: TData
  error?: TError
}

export type Task<TId, TInput, TData, TError> = TId & TaskState<TId, TInput, TData, TError>

type Override<T, K> = Omit<T, keyof K> & K
export type TerminatedTask<TId, TInput, TData, TError> = TId &
  Override<TaskState<TId, TInput, TData, TError>, { status: TaskTerminatedStatus }>

export type ReadonlyTaskRepository<TId, TInput, TData, TError> = {
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: TId) => Promise<Task<TId, TInput, TData, TError> | undefined>
  has: (id: TId) => Promise<boolean>
  query: (query: Partial<TaskState<TId, TInput, TData, TError>>) => Promise<Task<TId, TInput, TData, TError>[]>
  queryOlderThan: (
    query: Partial<TaskState<TId, TInput, TData, TError>>,
    threshold: Date
  ) => Promise<Task<TId, TInput, TData, TError>[]>
}

export type TaskRepository<TId, TInput, TData, TError> = ReadonlyTaskRepository<TId, TInput, TData, TError> & {
  set: (task: Task<TId, TInput, TData, TError>) => Promise<void>
}

export type SafeTaskRepository<TId, TInput, TData, TError> = ReadonlyTaskRepository<TId, TInput, TData, TError> & {
  inTransaction: (trx: TaskTrx<TId, TInput, TData, TError>, name: string) => Promise<void>
}

export type TaskProgress = {
  start: number
  end: number
  current: number
}

export type QueueOptions<_TId, _TInput, TData, _TError> = {
  maxTasks: number
  initialProgress: TaskProgress
  initialData: TData
  maxProgressDelay: number
  progressThrottle: number
}

export type TaskQueue<TId, TInput, _TData, _TError> = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getLocalTaskCount(): Promise<number>
  queueTask(id: TId, input: TInput): Promise<void>
  cancelTask(id: TId): Promise<void>
}
