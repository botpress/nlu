import child_process from 'child_process'
import yn from 'yn'
import { SIG_KILL } from './signals'
import { FullLogger } from './typings'
import { Options, WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ProcessPool<I, O> extends WorkerPool<I, O> {
  constructor(logger: FullLogger, config: Options) {
    super(logger, config)
  }

  createWorker = async (entryPoint: string, env: _.Dictionary<string>) => {
    const worker = child_process.fork(entryPoint, [], {
      env: { ...env, CHILD: 'true' }
    })
    return Worker.fromProcess(worker)
  }

  isMainWorker = () => {
    return !yn(process.env.CHILD)
  }

  public cancel(id: string) {
    super._scheduler.cancel(id, (w) => (w.innerWorker.worker as child_process.ChildProcess).kill(SIG_KILL))
  }
}

export class ProcessEntyPoint<I, O> extends WorkerEntryPoint<I, O> {
  isMainWorker = () => {
    return !yn(process.env.CHILD)
  }
}
