export type TaskTrx<TInput, TData, TError> = (repo: TaskRepository<TInput, TData, TError>) => Promise<void>

export type TaskHandler<TInput, TData, TError> = (task: Task<TInput, TData, TError>) => Promise<void>
export type ProgressCb = (progress: TaskProgress) => void

export type TaskRunner<TInput, TData, TError> = {
  run: (task: Task<TInput, TData, TError>, progress: ProgressCb) => Promise<TerminatedTask<TInput, TData, TError>>
  cancel: (task: Task<TInput, TData, TError>) => Promise<void>
}

export type TaskErrorType = 'zombie-task' | 'internal'
export type TaskError<_TInput, _TData, TError> = { message: string; stack?: string } & (
  | {
      type: 'zombie-task'
    }
  | { type: 'internal'; data: TError }
)

export type TaskTerminatedStatus = 'done' | 'canceled' | 'errored'
export type TaskStatus = TaskTerminatedStatus | 'pending' | 'running'
export type TaskState = {
  status: TaskStatus
  cluster: string
  progress: TaskProgress
}

export type Task<TInput, TData, TError> = TaskState & {
  id: string
  input: TInput
  data: TData
  error?: TaskError<TInput, TData, TError>
}

type Override<T, K> = Omit<T, keyof K> & K
export type TerminatedTask<TInput, TData, TError> = Override<
  Task<TInput, TData, TError>,
  { status: TaskTerminatedStatus }
>

export type ReadonlyTaskRepository<TInput, TData, TError> = {
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: string) => Promise<Task<TInput, TData, TError> | undefined>
  has: (id: string) => Promise<boolean>
  query: (query: Partial<TaskState>) => Promise<Task<TInput, TData, TError>[]>
  queryOlderThan: (query: Partial<TaskState>, threshold: Date) => Promise<Task<TInput, TData, TError>[]>
}

export type TaskRepository<TInput, TData, TError> = ReadonlyTaskRepository<TInput, TData, TError> & {
  set: (task: Task<TInput, TData, TError>) => Promise<void>
}

export type SafeTaskRepository<TInput, TData, TError> = ReadonlyTaskRepository<TInput, TData, TError> & {
  inTransaction: (trx: TaskTrx<TInput, TData, TError>, name: string) => Promise<void>
}

export type TaskProgress = {
  start: number
  end: number
  current: number
}

export type QueueOptions<_TInput, TData, _TError> = {
  maxTasks: number
  initialProgress: TaskProgress
  initialData: TData
  maxProgressDelay: number
  progressThrottle: number
}

export type TaskQueue<TInput, _TData, _TError> = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getLocalTaskCount(): Promise<number>
  queueTask(taskId: string, input: TInput): Promise<void>
  cancelTask(taskId: string): Promise<void>
}
