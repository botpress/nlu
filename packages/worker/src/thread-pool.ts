import { Worker as Thread, isMainThread } from 'worker_threads'
import { FullLogger } from './typings'
import { Options, WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ThreadPool<I, O> extends WorkerPool<I, O> {
  constructor(logger: FullLogger, config: Options) {
    super(logger, config)
  }

  createWorker = async (entryPoint: string, env: _.Dictionary<string>) => {
    const worker = new Thread(entryPoint, { ...env })
    return Worker.fromThread(worker)
  }

  isMainWorker = () => {
    return isMainThread
  }
}

export class ThreadEntyPoint<I, O> extends WorkerEntryPoint<I, O> {
  isMainWorker = () => {
    return isMainThread
  }
}
