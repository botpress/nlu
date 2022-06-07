import _ from 'lodash'
import { LockedTransactionQueue, Logger, Task } from './typings'

export class InMemoryTransactionQueue<T> implements LockedTransactionQueue<T> {
  private _tasks: Task<void>[] = []

  constructor(private _logger?: Logger) {}

  public async initialize() {}
  public async teardown() {}

  public runInLock(t: Task<T>): Promise<T> {
    this._logger?.(`Task "${t.name}" waiting.`)

    return new Promise<T>((resolve, reject) => {
      const mockTask: Task<void> = {
        name: t.name,
        cb: async () => {
          try {
            this._logger?.(`Task "${t.name}" started.`)
            const x = await t.cb()
            this._logger?.(`Task "${t.name}" done.`)
            resolve(x)
            return
          } catch (err) {
            reject(err)
            return
          }
        }
      }
      this._push(mockTask)
    })
  }

  private _push(t: Task<void>) {
    const first = !this._tasks.length
    this._tasks.unshift(t)

    // to keep this function sync
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    first && this._runNext()
  }

  private async _runNext(): Promise<void> {
    const next = _.last(this._tasks)
    if (!next) {
      return
    }

    void next.cb().then(() => {
      _.remove(this._tasks, (t) => t.name === next.name)
      void this._runNext() // pseudo-recursion (does not exceed stack)
    })
  }
}
