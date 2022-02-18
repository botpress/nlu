import { Logger } from '@botpress/logger'
import { TrainingError, TrainingErrorType, TrainingStatus } from '@botpress/nlu-client'
import { modelIdService } from '@botpress/nlu-engine'
import { Knex } from 'knex'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { createTableIfNotExists } from '../../utils/database'
import { packTrainSet, unpackTrainSet } from '../dataset-serializer'
import { Training, TrainingId, TrainingState, TrainingRepository, TrainingListener } from './typings'

const TABLE_NAME = 'nlu_trainings'
const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

type TableId = {
  appId: string
  modelId: string
}
type TableRow = {
  status: TrainingStatus
  progress: number
  error_type?: TrainingErrorType
  error_message?: string
  error_stack?: string
  cluster: string
  dataset: string
  updatedOn: string
} & TableId

export class DbTrainingRepository implements TrainingRepository {
  private _listeners: TrainingListener[] = []
  private _janitorIntervalId: NodeJS.Timeout | undefined

  constructor(private _database: Knex, private _logger: Logger) {}

  public addListener(listener: TrainingListener) {
    this._listeners.push(listener)
  }

  public removeListener(listenerToRemove: TrainingListener) {
    _.remove(this._listeners, (listener) => listener === listenerToRemove)
  }

  public async initialize(): Promise<void> {
    await createTableIfNotExists(this._database, TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.string('status').notNullable()
      table.float('progress').notNullable()
      table.text('dataset').notNullable()
      table.string('error_type').nullable()
      table.text('error_message').nullable()
      table.text('error_stack').nullable()
      table.string('cluster').nullable()
      table.timestamp('updatedOn').notNullable()
      table.primary(['appId', 'modelId'])
    })

    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_MS_INTERVAL)
  }

  public async teardown(): Promise<void> {
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
  }

  private get table() {
    return this._database.table<TableRow>(TABLE_NAME)
  }

  public set = async (training: Training): Promise<void> => {
    this._onTrainingEvent(training)
    const row = this._trainingToRow(training)
    const { appId, modelId } = row

    if (await this.has(training)) {
      return this.table.where({ appId, modelId }).update(row)
    }
    return this.table.insert(row)
  }

  public has = async (trainId: TrainingId): Promise<boolean> => {
    const result = !!(await this.get(trainId))
    return result
  }

  public get = async (trainId: TrainingId): Promise<Training | undefined> => {
    const tableId = this._trainIdToRow(trainId)
    const row: TableRow | undefined = await this.table.where(tableId).select('*').first()
    return row && this._rowToTraining(row)
  }

  public query = async (query: Partial<TrainingState>): Promise<Training[]> => {
    const rowFilters: Partial<TableRow> = this._partialTrainStateToQuery(query)
    const rows: TableRow[] = await this.table.where(rowFilters).select('*')
    return rows.map(this._rowToTraining.bind(this))
  }

  public delete = async (trainId: TrainingId): Promise<void> => {
    const tableId = this._trainIdToRow(trainId)
    return this.table.where(tableId).delete()
  }

  public queryOlderThan = async (query: Partial<TrainingState>, threshold: Date): Promise<Training[]> => {
    const iso = threshold.toISOString()

    const rowFilters: Partial<TableRow> = this._partialTrainStateToQuery(query)
    const rows: TableRow[] = await this.table.where(rowFilters).where('updatedOn', '<=', iso).select('*')

    return rows.map(this._rowToTraining.bind(this))
  }

  private async _janitor() {
    const now = moment()
    const before = now.subtract({ milliseconds: MS_BEFORE_PRUNE })
    const nDeletions = await this._deleteOlderThan(before.toDate())
    if (nDeletions) {
      this._logger.debug(`Pruning ${nDeletions} training state from database`)
    }
    return
  }

  private _deleteOlderThan = async (threshold: Date): Promise<number> => {
    const iso = threshold.toISOString()
    return this.table.where('updatedOn', '<=', iso).delete()
  }

  private _trainingToRow(train: Training): TableRow {
    const id = this._trainIdToRow(train)
    const state = this._trainStateToRow(train)
    const dataset = packTrainSet(train.dataset)
    return {
      ...id,
      ...state,
      dataset
    }
  }

  private _trainIdToRow(trainId: TrainingId): TableId {
    const { appId, modelId } = trainId
    return {
      appId,
      modelId: modelIdService.toString(modelId)
    }
  }

  private _partialTrainStateToQuery = (state: Partial<TrainingState>): Partial<Omit<TableRow, keyof TableId>> => {
    const { progress, status, error, cluster } = state
    const { type: error_type, message: error_message, stack: error_stack } = error || {}
    const rowFilters = {
      status,
      progress,
      error_type,
      error_message,
      error_stack,
      cluster
    }
    return _.pickBy(rowFilters, _.negate(_.isUndefined))
  }

  private _trainStateToRow = (state: TrainingState): Omit<TableRow, keyof TableId | 'dataset'> => {
    const { progress, status, error, cluster } = state
    const { type: error_type, message: error_message, stack: error_stack } = error || {}
    return {
      status,
      progress,
      error_type,
      error_message,
      error_stack,
      cluster,
      updatedOn: new Date().toISOString()
    }
  }

  private _rowToTraining(row: TableRow): Training {
    const { appId, modelId: stringId, status, progress, error_type, error_message, error_stack, cluster, dataset } = row

    const modelId = modelIdService.fromString(stringId)

    const error: TrainingError | undefined =
      status === 'errored'
        ? {
            type: error_type!,
            message: error_message!,
            stack: error_stack!
          }
        : undefined

    return {
      appId,
      modelId,
      status,
      progress,
      error,
      cluster,
      dataset: unpackTrainSet(dataset)
    }
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
