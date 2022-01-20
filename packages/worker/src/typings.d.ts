export type Logger = {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
  sub: (namespace: string) => Logger
}

export type SerializedError = {
  message: string
  stack?: string
  data: any
}

export type ErrorSerializer = {
  serializeError(err: Error): SerializedError
}

export type ErrorDeserializer = {
  deserializeError(err: SerializedError): Error
}

export type TaskDefinition<I> = {
  input: I
  logger: Logger
  progress: (p: number) => void
}

export type TaskHandler<I, O> = (def: TaskDefinition<I>) => Promise<O>

export namespace errors {
  export class TaskAlreadyStartedError extends Error {}
  export class TaskCanceledError extends Error {}

  export type TaskExitedUnexpectedlyErrorArgs = {
    wType: 'thread' | 'process'
    wid: number | undefined
    exitCode: number
    signal: string
  }

  export class TaskExitedUnexpectedlyError extends Error {
    public wid: number | undefined
    public exitCode: number
    public signal: string
    constructor(worker: TaskExitedUnexpectedlyErrorArgs)
  }
}

export type PoolOptions = {
  entryPoint: string
  maxWorkers: number
  env: NodeJS.ProcessEnv
  errorHandler?: ErrorDeserializer
}

export type WorkerPool<I, O> = {
  run(taskId: string, input: I, progress: (x: number) => void): Promise<O>
}

export type EntryPointOptions = {
  errorHandler?: ErrorSerializer
}

export type WorkerEntryPoint<I, O> = {
  initialize(): Promise<void>
  listenForTask(handler: TaskHandler<I, O>): void
  isMainWorker: () => boolean
  logger: Logger
}
export type ProcessPool<I, O> = WorkerPool<I, O> & {
  cancel(id: string)
}
export type ProcessEntyPoint<I, O> = {} & WorkerEntryPoint<I, O>

export type ThreadPool<I, O> = {} & WorkerPool<I, O>
export type ThreadEntyPoint<I, O> = {} & WorkerEntryPoint<I, O>

export const makeProcessPool: <I, O>(logger: Logger, config: PoolOptions) => ProcessPool<I, O>
export const makeProcessEntryPoint: <I, O>(config?: EntryPointOptions) => ProcessEntyPoint<I, O>
export const makeThreadPool: <I, O>(logger: Logger, config: PoolOptions) => ThreadPool<I, O>
export const makeThreadEntryPoint: <I, O>(config?: EntryPointOptions) => ThreadEntyPoint<I, O>
