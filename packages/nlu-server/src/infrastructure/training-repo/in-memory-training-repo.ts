import { makeInMemoryTrxQueue, LockedTransactionQueue } from '@botpress/locks'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'

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

interface TrainEntry {
  state: TrainingState & { updatedOn: Date }
  set: TrainInput
}

class WrittableTrainingRepo implements WrittableTrainingRepository {
  private _trainSessions: {
    [key: string]: TrainEntry
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

  private async _janitor() {
    const threshold = moment().subtract(MS_BEFORE_PRUNE, 'ms').toDate()

    const trainingsToPrune = await this.queryOlderThan({}, threshold)
    if (trainingsToPrune.length) {
      this._logger.debug(`Pruning ${trainingsToPrune.length} training state from memory`)
    }
    return Bluebird.each(trainingsToPrune, (t) => this.delete(t.id))
  }

  public async get(id: TrainingId): Promise<Training | undefined> {
    const key = this._makeTrainingKey(id)
    const currentTraining = this._trainSessions[key]
    if (!currentTraining) {
      return
    }
    const { set, state } = currentTraining
    return { id, state, set }
  }

  public async set(training: Training): Promise<void> {
    const { id, state, set } = training
    const key = this._makeTrainingKey(id)
    const newState = { ...state, updatedOn: new Date() }
    this._trainSessions[key] = { state: newState, set }
  }

  public async query(query: Partial<TrainingState>): Promise<Training[]> {
    const allTrainings = this._getAllTrainings()
    return this._filter(allTrainings, query)
  }

  public queryOlderThan = async (query: Partial<TrainingState>, threshold: Date): Promise<Training[]> => {
    const allTrainings = this._getAllTrainings()
    const olderThan = allTrainings.filter((t) => moment(t.state.updatedOn).isBefore(threshold))
    return this._filter(olderThan, query)
  }

  private _filter = (trainings: Training[], filters: Partial<TrainingState>) => {
    let queryResult: Training[] = trainings

    for (const field in filters) {
      queryResult = queryResult.filter((t) => t.state[field] === filters[field])
    }

    return queryResult
  }

  private _getAllTrainings = (): ({ id: TrainingId } & TrainEntry)[] => {
    return _(this._trainSessions)
      .toPairs()
      .map(([key, value]) => ({ id: this._parseTrainingKey(key), state: value.state, set: value.set }))
      .value()
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
  private _trxQueue: LockedTransactionQueue<void>
  private _writtableRepo: WrittableTrainingRepo

  constructor(logger: Logger) {
    const logCb = (msg: string) => logger.sub('trx-queue').debug(msg)
    this._trxQueue = makeInMemoryTrxQueue(logCb)
    this._writtableRepo = new WrittableTrainingRepo(logger)
  }

  public async initialize(): Promise<void> {
    return this._writtableRepo.initialize()
  }

  public async get(id: TrainingId): Promise<Training | undefined> {
    return this._writtableRepo.get(id)
  }

  public async query(query: Partial<TrainingState>): Promise<Training[]> {
    return this._writtableRepo.query(query)
  }

  public async queryOlderThan(query: Partial<TrainingState>, threshold: Date): Promise<Training[]> {
    return this._writtableRepo.queryOlderThan(query, threshold)
  }

  public async delete(id: TrainingId): Promise<void> {
    return this._writtableRepo.delete(id)
  }

  public async teardown() {
    return this._writtableRepo.teardown()
  }

  public async inTransaction(trx: TrainingTrx, name: string): Promise<void> {
    return this._trxQueue.runInLock({
      name,
      cb: () => trx(this._writtableRepo)
    })
  }
}
