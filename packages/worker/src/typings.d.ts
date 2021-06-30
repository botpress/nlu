export interface Logger {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
  sub: (namespace: string) => Logger
}

export interface TaskDefinition<I> {
  input: I
  logger: Logger // TODO use the actual logger implementation with a custom LogTransporter
  progress: (p: number) => void
}

export type TaskHandler<I, O> = (def: TaskDefinition<I>) => Promise<O>

export const errors: {
  isTaskAlreadyStarted: (err: Error) => boolean
  isTaskCanceled: (err: Error) => boolean
  isTaskExitedUnexpectedly: (err: Error) => boolean
}

export interface PoolOptions {
  entryPoint: string
  maxWorkers: number
  env: NodeJS.ProcessEnv
}

export interface WorkerPool<I, O> {
  run(taskId: string, input: I, progress: (x: number) => void): Promise<O>
}

export interface WorkerEntryPoint<I, O> {
  initialize(): Promise<void>
  listenForTask(handler: TaskHandler<I, O>): void
  logger: Logger
}
export interface ProcessPool<I, O> extends WorkerPool<I, O> {
  cancel(id: string)
}
export interface ProcessEntyPoint<I, O> extends WorkerEntryPoint<I, O> {}

export interface ThreadPool<I, O> extends WorkerPool<I, O> {}
export interface ThreadEntyPoint<I, O> extends WorkerEntryPoint<I, O> {}

export const makeProcessPool: <I, O>(logger: Logger, config: PoolOptions) => ProcessPool<I, O>
export const makeProcessEntryPoint: <I, O>() => ProcessEntyPoint<I, O>
export const makeThreadPool: <I, O>(logger: Logger, config: PoolOptions) => ThreadPool<I, O>
export const makeThreadEntryPoint: <I, O>() => ThreadEntyPoint<I, O>
