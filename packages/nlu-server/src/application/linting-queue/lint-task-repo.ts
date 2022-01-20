import { LintingId, LintingRepository } from '../../infrastructure'
import { mapLintingToTask, mapTaskQueryToLintingQuery, mapTaskToLinting } from './lint-task-mapper'
import { LintTask, LintTaskRepository } from './typings'

/** Maps target interface to actual linting repository */
export class LintTaskRepo implements LintTaskRepository {
  constructor(private _lintRepo: LintingRepository) {}
  public initialize = this._lintRepo.initialize
  public teardown = this._lintRepo.teardown
  public has = this._lintRepo.has.bind(this._lintRepo)

  public async get(lintId: LintingId): Promise<LintTask | undefined> {
    const linting = await this._lintRepo.get(lintId)
    return linting && mapLintingToTask(linting)
  }

  public async query(taskQuery: Partial<LintTask>): Promise<LintTask[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.query(lintQuery)
    return lintings.map(mapLintingToTask)
  }

  public async queryOlderThan(taskQuery: Partial<LintTask>, threshold: Date): Promise<LintTask[]> {
    const lintQuery = mapTaskQueryToLintingQuery(taskQuery)
    const lintings = await this._lintRepo.queryOlderThan(lintQuery, threshold)
    return lintings.map(mapLintingToTask)
  }

  public async set(task: LintTask): Promise<void> {
    const linting = mapTaskToLinting(task)
    return this._lintRepo.set(linting)
  }
}
