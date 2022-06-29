import ms from 'ms'
import { TransactionLocker } from '../locks'
import { SafeTaskRepository as ISafeTaskRepository, TaskRepository, TaskTrx } from './typings'

const TRANSACTION_TIMEOUT_MS = ms('5s')

export class SafeTaskRepo<TId, TInput, TData, TError> implements ISafeTaskRepository<TId, TInput, TData, TError> {
  constructor(
    private _taskRepo: TaskRepository<TId, TInput, TData, TError>,
    private _trxLock: TransactionLocker<void>
  ) {}

  public initialize = this._trxLock.initialize.bind(this._trxLock)
  public teardown = this._trxLock.teardown.bind(this._trxLock)
  public get = this._taskRepo.get.bind(this._taskRepo)
  public has = this._taskRepo.has.bind(this._taskRepo)
  public query = this._taskRepo.query.bind(this._taskRepo)
  public queryOlderThan = this._taskRepo.queryOlderThan.bind(this._taskRepo)

  public inTransaction(trx: TaskTrx<TId, TInput, TData, TError>, name: string): Promise<void> {
    const cb = async () => {
      const operation = () => trx(this._taskRepo)
      return Promise.race([operation(), this._timeout(TRANSACTION_TIMEOUT_MS)])
    }

    return this._trxLock.runInLock({
      name,
      cb
    })
  }

  private _timeout = (ms: number) => {
    return new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error("Transaction exceeded it's time limit")), ms)
    })
  }
}
