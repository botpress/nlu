import { ChildProcess } from 'child_process'
import { Worker as Thread } from 'worker_threads'

type InnerWorker =
  | {
      type: 'thread'
      worker: Thread
    }
  | {
      type: 'process'
      worker: ChildProcess
    }

export class Worker {
  public static fromThread(thread: Thread): Worker {
    return new Worker({ type: 'thread', worker: thread })
  }

  public static fromProcess(process: ChildProcess): Worker {
    return new Worker({ type: 'process', worker: process })
  }

  private constructor(private _innerWorker: InnerWorker) {}

  public message(msg: any) {
    if (this._innerWorker.type === 'thread') {
      this._innerWorker.worker.postMessage(msg)
      return
    }
    this._innerWorker.worker.send(msg)
  }

  public get wid() {
    if (this._innerWorker.type === 'thread') {
      return this._innerWorker.worker.threadId
    }
    return this._innerWorker.worker.pid
  }

  public on = this._innerWorker.worker.on.bind(this._innerWorker.worker)
  public once = this._innerWorker.worker.once.bind(this._innerWorker.worker)
  public off = this._innerWorker.worker.off.bind(this._innerWorker.worker)

  public get innerWorker() {
    return this._innerWorker
  }
}
