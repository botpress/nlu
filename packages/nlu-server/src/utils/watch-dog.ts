class Interval<X extends any[]> {
  private _int: number | undefined

  constructor(private f: Func<X, void>, private ms: number) {
    this.reset()
  }

  reset(): void {
    this.stop()
    this._int = setInterval(this.f, this.ms)
  }

  stop(): void {
    this._int && clearInterval(this._int)
  }
}

type Func<X extends any[], Y extends void> = (...x: X) => Y

export interface WatchDog<X extends any[]> {
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
  const interval = new Interval(f, ms)

  const run: Func<X, void> = (...x: X): void => {
    interval.reset()
    return f(...x)
  }

  const stop = () => {
    interval.stop()
  }

  return {
    run,
    stop
  }
}
