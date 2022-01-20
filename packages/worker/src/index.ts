import { ProcessEntyPoint, ProcessPool } from './process-pool'
import { ThreadEntyPoint, ThreadPool } from './thread-pool'

import * as types from './typings'

export * as errors from './errors'

export const makeProcessPool: typeof types.makeProcessPool = (logger: types.Logger, config: types.PoolOptions) =>
  new ProcessPool(logger, config)
export const makeProcessEntryPoint: typeof types.makeProcessEntryPoint = (config?: types.EntryPointOptions) =>
  new ProcessEntyPoint(config)
export const makeThreadPool: typeof types.makeThreadPool = (logger: types.Logger, config: types.PoolOptions) =>
  new ThreadPool(logger, config)
export const makeThreadEntryPoint: typeof types.makeThreadEntryPoint = (config?: types.EntryPointOptions) =>
  new ThreadEntyPoint(config)
