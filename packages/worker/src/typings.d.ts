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

export type TaskProgress<I, O, P = void> = P extends void ? (p: number) => void : (p: number, data: P) => void
export type TaskDefinition<I, O, P = void> = {
  input: I
  logger: Logger
  progress: TaskProgress<I, O, P>
}

export type TaskHandler<I, O, P = void> = (def: TaskDefinition<I, O, P>) => Promise<O>

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

export type WorkerPool<I, O, P = void> = {
  run(taskId: string, input: I, progress: TaskProgress<I, O, P>): Promise<O>
}

export type EntryPointOptions = {
  errorHandler?: ErrorSerializer
}

export type WorkerEntryPoint<I, O, P = void> = {
  initialize(): Promise<void>
  listenForTask(handler: TaskHandler<I, O, P>): void
  isMainWorker: () => boolean
  logger: Logger
}

export type ProcessPool<I, O, P = void> = WorkerPool<I, O, P> & {
  cancel(id: string)
}

export type ProcessEntyPoint<I, O, P = void> = {} & WorkerEntryPoint<I, O, P>

export type ThreadPool<I, O, P = void> = {} & WorkerPool<I, O, P>
export type ThreadEntyPoint<I, O, P = void> = {} & WorkerEntryPoint<I, O, P>

export const makeProcessPool: <I, O, P = void>(logger: Logger, config: PoolOptions) => ProcessPool<I, O, P>
export const makeProcessEntryPoint: <I, O, P = void>(config?: EntryPointOptions) => ProcessEntyPoint<I, O, P>
export const makeThreadPool: <I, O, P = void>(logger: Logger, config: PoolOptions) => ThreadPool<I, O, P>
export const makeThreadEntryPoint: <I, O, P = void>(config?: EntryPointOptions) => ThreadEntyPoint<I, O, P>
