import child_process, { ForkOptions } from 'child_process'
import yn from 'yn'
import { Logger, PoolOptions, EntryPointOptions } from './typings'
import { WorkerPool } from './worker-pool'
import { Worker } from './worker-pool/worker'
import { WorkerEntryPoint } from './worker-pool/worker-entry-point'

export class ProcessPool<I, O, P = void> extends WorkerPool<I, O, P> {
  constructor(logger: Logger, config: PoolOptions) {
    super(logger, config)
  }

  public createWorker = async (entryPoint: string, environment: NodeJS.ProcessEnv) => {
    const env = { ...environment, CHILD: 'true' }
    const options: ForkOptions = (process as any).pkg
      ? {
          env,
          execArgv: []
        }
      : { env }
    const worker = child_process.fork(entryPoint, [], options)
    return Worker.fromProcess(worker)
  }

  public isMainWorker = () => {
    return !yn(process.env.CHILD)
  }
}

export class ProcessEntyPoint<I, O, P = void> extends WorkerEntryPoint<I, O, P> {
  constructor(config?: EntryPointOptions) {
    super(config)
  }

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
