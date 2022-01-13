import { TransactionLocker } from '../locks'
import { SafeTaskRepository as ISafeTaskRepository, Task, TaskRepository, TaskState, TaskTrx } from './typings'

export class SafeTaskRepo<TaskInput, TaskData> implements ISafeTaskRepository<TaskInput, TaskData> {
  constructor(private _taskRepo: TaskRepository<TaskInput, TaskData>, private _trxQueue: TransactionLocker<void>) {}

  public async initialize(): Promise<void> {
    return this._taskRepo.initialize()
  }

  public async get(id: string): Promise<Task<TaskInput, TaskData> | undefined> {
    return this._taskRepo.get(id)
  }

  public async has(id: string): Promise<boolean> {
    return this._taskRepo.has(id)
  }

  public async query(query: Partial<TaskState>): Promise<Task<TaskInput, TaskData>[]> {
    return this._taskRepo.query(query)
  }

  public async queryOlderThan(query: Partial<TaskState>, threshold: Date): Promise<Task<TaskInput, TaskData>[]> {
    return this._taskRepo.queryOlderThan(query, threshold)
  }

  public async teardown() {
    return this._taskRepo.teardown()
  }

  public async inTransaction(trx: TaskTrx<TaskInput, TaskData>, name: string): Promise<void> {
    return this._trxQueue.runInLock({
      name,
      cb: () => trx(this._taskRepo)
    })
  }
}
