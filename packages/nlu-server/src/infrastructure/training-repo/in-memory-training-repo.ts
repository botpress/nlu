import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'

import { Training, TrainingId, TrainingState, TrainingRepository, TrainingListener } from './typings'

const KEY_JOIN_CHAR = '\u2581'

const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

type TrainEntry = TrainingState & { updatedOn: Date } & {
  dataset: TrainInput
}

export class InMemoryTrainingRepo implements TrainingRepository {
  private _listeners: TrainingListener[] = []
  private _trainSessions: {
    [key: string]: TrainEntry
  } = {}

  private _janitorIntervalId: NodeJS.Timeout | undefined

  constructor(private _logger: Logger) {}

  public addListener(listener: TrainingListener) {
    this._listeners.push(listener)
  }

  public removeListener(listenerToRemove: TrainingListener) {
    _.remove(this._listeners, (listener) => listener === listenerToRemove)
  }

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
    return Bluebird.each(trainingsToPrune, (t) => this.delete(t))
  }

  public async get(id: TrainingId): Promise<Training | undefined> {
    const key = this._makeTrainingKey(id)
    const currentTraining = this._trainSessions[key]
    if (!currentTraining) {
      return
    }
    return { ...id, ...currentTraining }
  }

  public async set(training: Training): Promise<void> {
    this._onTrainingEvent(training)
    const key = this._makeTrainingKey(training)
    this._trainSessions[key] = { ...training, updatedOn: new Date() }
  }

  public has = async (trainId: TrainingId): Promise<boolean> => {
    const result = !!(await this.get(trainId))
    return result
  }

  public async query(query: Partial<Training>): Promise<Training[]> {
    const allTrainings = this._getAllTrainings()
    return this._filter(allTrainings, query)
  }

  public queryOlderThan = async (query: Partial<Training>, threshold: Date): Promise<Training[]> => {
    const allTrainings = this._getAllTrainings()
    const olderThan = allTrainings.filter((t) => moment(t.updatedOn).isBefore(threshold))
    return this._filter(olderThan, query)
  }

  private _filter = (trainings: Training[], filters: Partial<TrainingState>) => {
    let queryResult: Training[] = trainings

    for (const field in filters) {
      queryResult = queryResult.filter((t) => t[field] === filters[field])
    }

    return queryResult
  }

  private _getAllTrainings = (): (Training & { updatedOn: Date })[] => {
    return _(this._trainSessions)
      .toPairs()
      .map(([key, value]) => ({ ...this._parseTrainingKey(key), ...value }))
      .value()
  }

  public async delete(id: TrainingId): Promise<void> {
    const key = this._makeTrainingKey(id)
    delete this._trainSessions[key]
  }

  private _makeTrainingKey(id: TrainingId) {
    const { appId, modelId } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return [stringId, appId].join(KEY_JOIN_CHAR)
  }

  private _parseTrainingKey(key: string): TrainingId {
    const [stringId, appId] = key.split(KEY_JOIN_CHAR)
    const modelId = NLUEngine.modelIdService.fromString(stringId)
    return { modelId, appId }
  }

  private _onTrainingEvent(training: Training) {
    this._listeners.forEach((listener) => {
      // The await keyword isn't used to prevent a listener from blocking the training repo
      listener(training).catch((e) =>
        this._logger.attachError(e).error('an error occured in the training repository listener')
      )
    })
  }
}
