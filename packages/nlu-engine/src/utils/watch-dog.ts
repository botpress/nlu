class _WatchDog<X extends any[]> {
  private _isDead = false
  private _int: number | undefined

  constructor(private f: Func<X, void>, private ms: number) {
    this._reset()
  }

  public run(...x: X) {
    if (this._isDead) {
      return
    }

    this._reset()
    return this.f(...x)
  }

  public stop(): void {
    this._isDead = true
    this._clear()
  }

  private _reset(): void {
    this._clear()
    this._int = setInterval(this.f, this.ms)
  }

  private _clear(): void {
    this._int && clearInterval(this._int)
    this._int = undefined
  }
}

type Func<X extends any[], Y extends any> = (...x: X) => Y

export type WatchDog<X extends any[]> = {
  run(...x: X): void
  stop: () => void
}

/**
 *
 * Basically the opposite of a throttle.
 * Ensures a function is executed at least every x ms.
 * Running the function mannualy only resets the timmer.
 *
 * @param f Function to run
 * @param ms Max allowed time beetween function invocation
 * @returns a watchdog object that can be ran or stopped
 */
export const watchDog = <X extends any[]>(f: Func<X, void>, ms: number): WatchDog<X> => {
  const dog = new _WatchDog(f, ms)
  return dog
}
