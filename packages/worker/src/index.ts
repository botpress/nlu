import { isTaskAlreadyStarted, isTaskCanceled, isTaskExitedUnexpectedly } from './errors'

import { ProcessEntyPoint, ProcessPool } from './process-pool'
import { ThreadEntyPoint, ThreadPool } from './thread-pool'
import { FullLogger } from './typings'
import { Options } from './worker-pool'
export const errors = {
  isTaskAlreadyStarted,
  isTaskCanceled,
  isTaskExitedUnexpectedly
}

export const makeProcessPool = (logger: FullLogger, config: Options) => new ProcessPool(logger, config)
export const makeProcessEntryPoint = () => new ProcessEntyPoint()
export const makeThreadPool = (logger: FullLogger, config: Options) => new ThreadPool(logger, config)
export const makeThreadEntryPoint = () => new ThreadEntyPoint()
