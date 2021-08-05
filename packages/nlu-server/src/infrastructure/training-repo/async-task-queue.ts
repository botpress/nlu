type Task<T> = () => Promise<T>

/**
 * Ansynchronous task queue
 *
 * Prevents race conditions by only running one task at a time.
 * Better than a mutex as tasks don't have to mannually check weither the ressource is free or not. Tasks are simply called when its there turn to run.
 */
export class AsynchronousTaskQueue<T> {
  private _tasks: Task<void>[] = []

  /**
   *
   * @param t The async function to run inside the queue. Will be run once the queue gets there.
   * @returns A promise that resolves once the task is done or throws
   */
  public runInQueue(t: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._push(() =>
        t()
          .then((x) => resolve(x))
          .catch((err) => reject(err))
      )
    })
  }

  private _push(t: Task<void>) {
    this._tasks.unshift(t)

    // to keep this function sync
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._runNext()
  }

  private async _runNext(): Promise<void> {
    const next = this._tasks.pop()
    if (!next) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    next().then(this._runNext.bind(this)) // pseudo-recursion (does not exceed stack)
  }
}
