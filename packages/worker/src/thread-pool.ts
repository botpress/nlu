import { Worker as Thread, isMainThread, parentPort } from 'worker_threads'
import { Logger, PoolOptions, EntryPointOptions } from './typings'
import { WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ThreadPool<I, O, P = void> extends WorkerPool<I, O, P> {
  constructor(logger: Logger, config: PoolOptions) {
    super(logger, config)
  }

  createWorker = async (entryPoint: string, env: NodeJS.ProcessEnv) => {
    const worker = new Thread(entryPoint, { env })
    return Worker.fromThread(worker)
  }

  isMainWorker = () => {
    return isMainThread
  }
}

export class ThreadEntyPoint<I, O, P = void> extends WorkerEntryPoint<I, O, P> {
  constructor(config?: EntryPointOptions) {
    super(config)
  }

  messageMain = (msg: any) => {
    parentPort?.postMessage(msg)
  }

  listenMain = (event: 'message', l: (msg: any) => void) => {
    parentPort?.on(event, l)
  }

  isMainWorker = () => {
    return isMainThread
  }
}
