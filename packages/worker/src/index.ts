import { isTaskAlreadyStarted, isTaskCanceled, isTaskExitedUnexpectedly } from './errors'

import { ProcessEntyPoint, ProcessPool } from './process-pool'
import { ThreadEntyPoint, ThreadPool } from './thread-pool'
import { Logger, PoolOptions } from './typings'

export const errors = {
  isTaskAlreadyStarted,
  isTaskCanceled,
  isTaskExitedUnexpectedly
}

export const makeProcessPool = (logger: Logger, config: PoolOptions) => new ProcessPool(logger, config)
export const makeProcessEntryPoint = () => new ProcessEntyPoint()
export const makeThreadPool = (logger: Logger, config: PoolOptions) => new ThreadPool(logger, config)
export const makeThreadEntryPoint = () => new ThreadEntyPoint()
