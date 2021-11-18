import { LockedTransactionQueue } from '@botpress/locks'
import { Logger } from '@botpress/logger'
import { TrainingError, TrainingErrorType, TrainingStatus, TrainInput } from '@botpress/nlu-client'
import { modelIdService } from '@botpress/nlu-engine'
import jsonpack from 'jsonpack'
import Knex from 'knex'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import {
  Training,
  TrainingId,
  TrainingState,
  WrittableTrainingRepository,
  TrainingTrx,
  TrainingRepository
} from './typings'

const TABLE_NAME = 'nlu_trainings'
const TRANSACTION_TIMEOUT_MS = ms('5s')

const timeout = <T>(ms: number) => {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error("Transaction exceeded it's time limit")), ms)
  })
}

const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

interface TableId {
  appId: string
  modelId: string
}
interface TableRow extends TableId {
  status: TrainingStatus
  progress: number
  error_type?: TrainingErrorType
  error_message?: string
  error_stack?: string
  cluster: string
  dataset: string
  updatedOn: string
}

class DbWrittableTrainingRepo implements WrittableTrainingRepository {
  constructor(protected _database: Knex, private _clusterId: string) {}

  public async initialize(): Promise<void> {
    await this._createTableIfNotExists(this._database, TABLE_NAME, (table) => {
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
  }

  private _createTableIfNotExists = async (knex: Knex, tableName: string, cb: Knex.KnexCallback): Promise<boolean> => {
    return knex.schema.hasTable(tableName).then((exists) => {
      if (exists) {
        return false
      }
      return knex.schema.createTable(tableName, cb).then(() => true)
    })
  }

  public async teardown(): Promise<void> {}

  private get table() {
    return this._database.table(TABLE_NAME)
  }

  public set = async (training: Training): Promise<void> => {
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

  public deleteOlderThan = async (threshold: Date): Promise<number> => {
    const iso = moment(threshold).toDate().toISOString()
    return this.table.where('updatedOn', '<=', iso).delete()
  }

  public queryOlderThan = async (query: Partial<TrainingState>, threshold: Date): Promise<Training[]> => {
    const iso = this._toISO(threshold)

    const rowFilters: Partial<TableRow> = this._partialTrainStateToQuery(query)
    const rows: TableRow[] = await this.table.where(rowFilters).where('updatedOn', '<=', iso).select('*')

    return rows.map(this._rowToTraining.bind(this))
  }

  private _trainingToRow(train: Training): TableRow {
    const id = this._trainIdToRow(train)
    const state = this._trainStateToRow(train)
    const dataset = this.packTrainSet(train.dataset)
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
    const { progress, status, error } = state
    const { type: error_type, message: error_message, stack: error_stack } = error || {}
    return {
      status,
      progress,
      error_type,
      error_message,
      error_stack,
      cluster: this._clusterId,
      updatedOn: this._toISO(new Date())
    }
  }

  private _toISO(date: Date): string {
    return moment(date).toDate().toISOString()
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
      dataset: this.unpackTrainSet(dataset)
    }
  }

  private packTrainSet(ts: TrainInput): string {
    return jsonpack.pack(ts)
  }

  private unpackTrainSet(compressed: string): TrainInput {
    return jsonpack.unpack<TrainInput>(compressed)
  }
}

export class DbTrainingRepository implements TrainingRepository {
  private _writtableTrainingRepo: DbWrittableTrainingRepo
  private _janitorIntervalId: NodeJS.Timeout | undefined
  private _logger: Logger

  constructor(
    private _database: Knex,
    private _trxQueue: LockedTransactionQueue<void>,
    logger: Logger,
    private _clusterId: string
  ) {
    this._writtableTrainingRepo = new DbWrittableTrainingRepo(_database, this._clusterId)
    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_MS_INTERVAL)
    this._logger = logger.sub('training-repo')
  }

  public initialize = async (): Promise<void> => {
    await this._writtableTrainingRepo.initialize()
    await this._trxQueue.initialize()
  }

  public async teardown(): Promise<void> {
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
    await this._trxQueue.teardown()
  }

  private async _janitor() {
    const now = moment()
    const before = now.subtract({ milliseconds: MS_BEFORE_PRUNE })
    const nDeletions = await this._writtableTrainingRepo.deleteOlderThan(before.toDate())
    if (nDeletions) {
      this._logger.debug(`Pruning ${nDeletions} training state from database`)
    }
    return
  }

  public inTransaction = async (action: TrainingTrx, name: string): Promise<void> => {
    const cb = async () => {
      const operation = async () => {
        const ctx = new DbWrittableTrainingRepo(this._database, this._clusterId)
        return action(ctx)
      }
      return Promise.race([operation(), timeout<void>(TRANSACTION_TIMEOUT_MS)])
    }

    return this._trxQueue.runInLock({
      name,
      cb
    })
  }

  public get = async (trainId: TrainingId): Promise<Training | undefined> => {
    return this._writtableTrainingRepo.get(trainId)
  }

  public has = async (trainId: TrainingId): Promise<boolean> => {
    return this._writtableTrainingRepo.has(trainId)
  }

  public query = async (query: Partial<TrainingState>): Promise<Training[]> => {
    return this._writtableTrainingRepo.query(query)
  }

  public queryOlderThan = async (query: Partial<TrainingState>, threshold: Date): Promise<Training[]> => {
    return this._writtableTrainingRepo.queryOlderThan(query, threshold)
  }

  public async delete(id: TrainingId): Promise<void> {
    return this._writtableTrainingRepo.delete(id)
  }
}
