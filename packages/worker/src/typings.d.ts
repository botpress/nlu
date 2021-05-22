export interface FullLogger {
  attachError(error: Error): this
  debug(message: string, metadata?: any): void
  info(message: string, metadata?: any): void
  warn(message: string, metadata?: any): void
  error(message: string, metadata?: any): void
  critical(message: string, metadata?: any): void
}

export interface SmallLogger {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
}

export interface TaskDefinition<I> {
  input: I
  logger: SmallLogger // TODO use the actual logger implementation with a custom LogTransporter
  progress: (p: number) => void
}

export type TaskHandler<I, O> = (def: TaskDefinition<I>) => Promise<O>

export const errors: {
  isTaskAlreadyStarted: (err: Error) => boolean
  isTaskCanceled: (err: Error) => boolean
  isTaskExitedUnexpectedly: (err: Error) => boolean
}

/**
 * #############
 * ### Pools ###
 * #############
 */
export interface WorkerPool<I, O> {
  run(taskId: string, input: I, progress: (x: number) => void): Promise<O>
}
export interface ThreadPool<I, O> extends WorkerPool<I, O> {}
export interface ProcessPool<I, O> extends WorkerPool<I, O> {
  cancel(id: string)
}

/**
 * ###############
 * ### Entries ###
 * ###############
 */
export interface WorkerEntryPoint<I, O> {
  initialize(): Promise<void>
  listenForTask(handler: TaskHandler<I, O>): void
  logger: SmallLogger
}
export interface ProcessEntyPoint<I, O> extends WorkerEntryPoint<I, O> {}
export interface ThreadEntyPoint<I, O> extends IWorkerEntryPoint<I, O> {}

export const makeProcessPool: <I, O>(logger: FullLogger, config: Options) => ProcessPool<I, O>
export const makeProcessEntryPoint: <I, O>() => ProcessEntyPoint<I, O>
export const makeThreadPool: <I, O>(logger: FullLogger, config: Options) => ThreadPool<I, O>
export const makeThreadEntryPoint: <I, O>() => ThreadEntyPoint<I, O>
