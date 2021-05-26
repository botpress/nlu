import child_process from 'child_process'
import yn from 'yn'
import { SIG_KILL } from './signals'
import { FullLogger, PoolOptions } from './typings'
import { WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ProcessPool<I, O> extends WorkerPool<I, O> {
  constructor(logger: FullLogger, config: PoolOptions) {
    super(logger, config)
  }

  createWorker = async (entryPoint: string, env: NodeJS.ProcessEnv) => {
    const worker = child_process.fork(entryPoint, [], {
      env: { ...env, CHILD: 'true' }
    })
    return Worker.fromProcess(worker)
  }

  isMainWorker = () => {
    return !yn(process.env.CHILD)
  }

  public cancel(id: string) {
    this._scheduler.cancel(id, (w) => (w.innerWorker.worker as child_process.ChildProcess).kill(SIG_KILL))
  }
}

export class ProcessEntyPoint<I, O> extends WorkerEntryPoint<I, O> {
  messageMain = (msg: any) => {
    process.send?.(msg)
  }

  listenMain = (event: 'message', l: (msg: any) => void) => {
    process.on(event, l)
  }

  isMainWorker = () => {
    return !yn(process.env.CHILD)
  }
}
