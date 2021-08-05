import { TrainingState } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import ms from 'ms'
import { AsynchronousTaskQueue } from './async-task-queue'

import { Training, TrainingId, TrainingRepository, TrainingTrx, WrittableTrainingRepository } from './typings'

const KEY_JOIN_CHAR = '\u2581'

const JANITOR_INTERVAL = ms('1m') // 60,000 ms

class WrittableTrainingRepo implements WrittableTrainingRepository {
  private trainSessions: {
    [key: string]: TrainingState & { updatedOn: Date }
  } = {}

  private _janitorIntervalId: NodeJS.Timeout | undefined

  public async initialize(): Promise<void> {
    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_INTERVAL)
  }

  public async teardown(): Promise<void> {
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
  }

  private _janitor() {
    // TODO: prune old trainings that are done / canceled / errored
  }

  public async get(id: TrainingId): Promise<TrainingState | undefined> {
    const key = this._makeTrainingKey(id)
    return this.trainSessions[key]
  }

  public async set(id: TrainingId, state: TrainingState): Promise<void> {
    const key = this._makeTrainingKey(id)
    this.trainSessions[key] = { ...state, updatedOn: new Date() }
  }

  public async query(query: Partial<TrainingState>): Promise<Training[]> {
    let queryResult: Training[] = _(this.trainSessions)
      .toPairs()
      .map(([key, state]) => ({ id: this._parseTrainingKey(key), state }))
      .value()

    for (const field in query) {
      queryResult = queryResult.filter((t) => t.state[field] === query[field])
    }

    return queryResult
  }

  async delete(id: TrainingId): Promise<void> {
    const key = this._makeTrainingKey(id)
    delete this.trainSessions[key]
  }

  private _makeTrainingKey(id: TrainingId) {
    const { appId, appSecret, ...modelId } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return [stringId, appId, appSecret].join(KEY_JOIN_CHAR)
  }

  private _parseTrainingKey(key: string): TrainingId {
    const [stringId, appId, appSecret] = key.split(KEY_JOIN_CHAR)
    const modelId = NLUEngine.modelIdService.fromString(stringId)
    return { ...modelId, appId, appSecret }
  }
}

export default class InMemoryTrainingRepo implements TrainingRepository {
  private _taskQueue = new AsynchronousTaskQueue<void>()
  private _writtableRepo = new WrittableTrainingRepo()

  constructor() {}

  public async initialize(): Promise<void> {
    return this._writtableRepo.initialize()
  }

  public async get(id: TrainingId): Promise<TrainingState | undefined> {
    return this._writtableRepo.get(id)
  }

  public async query(query: Partial<TrainingState>): Promise<Training[]> {
    return this._writtableRepo.query(query)
  }

  public async delete(id: TrainingId): Promise<void> {
    return this._writtableRepo.delete(id)
  }

  public async inTransaction(trx: TrainingTrx): Promise<void> {
    return this._taskQueue.runInQueue(() => trx(this._writtableRepo))
  }

  public async teardown() {
    return this._writtableRepo.teardown()
  }
}
