import { makeThreadPool, ThreadPool } from '@botpress/worker'
import _ from 'lodash'
import os from 'os'
import { Logger } from 'src/typings'
import { CRF, SVM } from '../toolkit'
import { ENTRY_POINT } from './thread-entry-point'
import { TaskInput, TaskOutput } from './typings'

class MLThreadPool {
  private _threadPool: ThreadPool<TaskInput, TaskOutput>

  constructor(logger: Logger) {
    const maxMLThreads = Math.max(os.cpus().length - 1, 1) // ncpus - webworker
    const userMlThread = process.env.BP_NUM_ML_THREADS ? Number(process.env.BP_NUM_ML_THREADS) : 4
    const numMLThreads = Math.min(maxMLThreads, userMlThread)

    const clean = (data: NodeJS.ProcessEnv) =>
      _.omitBy(data, (val) => _.isUndefined(val) || _.isNull(val) || typeof val === 'object')

    this._threadPool = makeThreadPool<TaskInput, TaskOutput>(logger, {
      maxWorkers: numMLThreads,
      entryPoint: ENTRY_POINT,
      env: { ...clean(process.env) }
    })
  }

  public startCrfTraining(
    trainId: string,
    points: CRF.DataPoint[],
    options: CRF.TrainerOptions,
    progress: (p: number) => void
  ) {
    const input: TaskInput = { trainingType: 'crf', points, options }
    return this._threadPool.run(trainId, input, progress)
  }

  public startSvmTraining(
    trainId: string,
    points: SVM.DataPoint[],
    options: SVM.SVMOptions,
    progress: (p: number) => void
  ) {
    const input: TaskInput = { trainingType: 'svm', points, options }
    return this._threadPool.run(trainId, input, progress)
  }
}

let mLThreadPool: MLThreadPool
export default (logger: Logger) => {
  if (!mLThreadPool) {
    mLThreadPool = new MLThreadPool(logger)
  }
  return mLThreadPool
}
