import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { AsynchronousTaskQueue } from './async-task-queue'

import {
  Training,
  TrainingId,
  TrainingState,
  TrainingRepository,
  TrainingTrx,
  WrittableTrainingRepository
} from './typings'

const KEY_JOIN_CHAR = '\u2581'

const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

class WrittableTrainingRepo implements WrittableTrainingRepository {
  private _trainSessions: {
    [key: string]: TrainingState
  } = {}

  private _logger: Logger
  constructor(logger: Logger) {
    this._logger = logger.sub('training-repo')
  }

  private _janitorIntervalId: NodeJS.Timeout | undefined

  public async initialize(): Promise<void> {
    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_MS_INTERVAL)
  }

  public async teardown(): Promise<void> {
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
  }

  private _janitor() {
    const allTrainings = _(this._trainSessions)
      .toPairs()
      .map(([key, state]) => ({ id: this._parseTrainingKey(key), state }))
      .value()

    const trainingsToPrune = allTrainings.filter((t) => {
      const diff = moment(new Date()).diff(t.state.updatedOn)
      const msDuration = moment.duration(diff).asMilliseconds()
      return msDuration >= MS_BEFORE_PRUNE
    })

    if (trainingsToPrune.length) {
      this._logger.debug(`Pruning ${trainingsToPrune.length} training state from memory`)
    }
    return Bluebird.each(trainingsToPrune, (t) => this.delete(t.id))
  }

  public async get(id: TrainingId): Promise<TrainingState | undefined> {
    const key = this._makeTrainingKey(id)
    return this._trainSessions[key]
  }

  public async set(id: TrainingId, state: TrainingState): Promise<void> {
    const key = this._makeTrainingKey(id)
    this._trainSessions[key] = { ...state, updatedOn: new Date() }
  }

  public async query(query: Partial<TrainingState>): Promise<Training[]> {
    let queryResult: Training[] = _(this._trainSessions)
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
    delete this._trainSessions[key]
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
  private _taskQueue: AsynchronousTaskQueue<void>
  private _writtableRepo: WrittableTrainingRepo

  constructor(logger: Logger) {
    this._taskQueue = new AsynchronousTaskQueue()
    this._writtableRepo = new WrittableTrainingRepo(logger)
  }

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

  public async teardown() {
    return this._writtableRepo.teardown()
  }

  public async inTransaction(trx: TrainingTrx): Promise<void> {
    return this._taskQueue.runInQueue(() => trx(this._writtableRepo))
  }
}
