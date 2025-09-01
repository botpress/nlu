import { TaskCanceledError, TaskAlreadyStartedError, TaskExitedUnexpectedlyError } from './errors'
import { ProcessEntryPoint, ProcessPool } from './process-pool'
import { ThreadEntryPoint, ThreadPool } from './thread-pool'

import * as types from './typings'

export const errors: typeof types.errors = {
  TaskCanceledError,
  TaskAlreadyStartedError,
  TaskExitedUnexpectedlyError
}

export const makeProcessPool: typeof types.makeProcessPool = (logger: types.Logger, config: types.PoolOptions) =>
  new ProcessPool(logger, config)
export const makeProcessEntryPoint: typeof types.makeProcessEntryPoint = (config?: types.EntryPointOptions) =>
  new ProcessEntryPoint(config)
export const makeThreadPool: typeof types.makeThreadPool = (logger: types.Logger, config: types.PoolOptions) =>
  new ThreadPool(logger, config)
export const makeThreadEntryPoint: typeof types.makeThreadEntryPoint = (config?: types.EntryPointOptions) =>
  new ThreadEntryPoint(config)
