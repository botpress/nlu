import { TransactionLocker } from '../locks'
import { SafeTaskRepository as ISafeTaskRepository, TaskRepository, TaskTrx } from './typings'

export class SafeTaskRepo<TInput, TData, TError> implements ISafeTaskRepository<TInput, TData, TError> {
  constructor(private _taskRepo: TaskRepository<TInput, TData, TError>, private _trxLock: TransactionLocker<void>) {}

  public initialize = this._taskRepo.initialize.bind(this._taskRepo)
  public get = this._taskRepo.get.bind(this._taskRepo)
  public has = this._taskRepo.has.bind(this._taskRepo)
  public query = this._taskRepo.query.bind(this._taskRepo)
  public queryOlderThan = this._taskRepo.queryOlderThan.bind(this._taskRepo)
  public teardown = this._taskRepo.teardown.bind(this._taskRepo)

  public inTransaction(trx: TaskTrx<TInput, TData, TError>, name: string): Promise<void> {
    return this._trxLock.runInLock({
      name,
      cb: () => trx(this._taskRepo)
    })
  }
}
