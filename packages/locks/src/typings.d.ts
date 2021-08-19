export interface Task<T> {
  name: string
  cb: () => Promise<T>
}

/**
 * Prevents race conditions by only running one task at a time.
 * Tasks are simply called when its there turn to run.
 *
 * Does not involve to mannualy check if lock is free.
 */
export interface LockedTransactionQueue<T> {
  /**
   * Waits for a lock to be free, aquires it and runs function
   * @param t The async function to run inside the aquire and release lock statement
   * @returns A promise that resolves of rejects once the task is done or throws
   */
  runInLock(t: Task<T>): Promise<T>
  initialize(): Promise<void>
  teardown(): Promise<void>
}

export type Logger = (msg: string) => void

/**
 * For race conditions occuring because of the event loop in a single-threaded application
 */
export const makeInMemoryTrxQueue: <T>(logger?: Logger) => LockedTransactionQueue<T>

/**
 * For race conditions occuring in distributed applications
 */
export const makePostgresTrxQueue: <T>(pgURI: string, logger?: Logger) => LockedTransactionQueue<T>
