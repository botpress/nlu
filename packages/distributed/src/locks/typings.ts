export type Transaction<T> = {
  name: string
  cb: () => Promise<T>
}

/**
 * Prevents race conditions by only running one task at a time.
 * Tasks are simply called when its there turn to run.
 *
 * Does not involve to manually check if lock is free.
 */
export type TransactionLocker<T> = {
  /**
   * Waits for a lock to be free, acquires it and runs function
   * @param t The async function to run inside the acquire and release lock statement
   * @returns A promise that resolves of rejects once the task is done or throws
   */
  runInLock(t: Transaction<T>): Promise<T>
  initialize(): Promise<void>
  teardown(): Promise<void>
}

export type Logger = (msg: string) => void
