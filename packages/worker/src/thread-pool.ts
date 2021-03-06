import { Worker as Thread, isMainThread, parentPort } from 'worker_threads'
import { Logger, PoolOptions } from './typings'
import { WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ThreadPool<I, O> extends WorkerPool<I, O> {
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

export class ThreadEntyPoint<I, O> extends WorkerEntryPoint<I, O> {
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
