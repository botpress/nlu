import { Logger } from '@botpress/logger'
import { http, TrainingError, TrainingErrorType, TrainingStatus } from '@botpress/nlu-client'
import { modelIdService } from '@botpress/nlu-engine'
import Knex, { Transaction } from 'knex'
import ms from 'ms'
import { nanoid } from 'nanoid'
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

const timeout = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Transaction exceeded it's time limit")), ms)
  })
}

const KEY_JOIN_CHAR = '\u2581'

const CLUSTER_ID = nanoid()

interface TableId {
  userId: string
  modelId: string
}
interface TableRow extends TableId {
  status: TrainingStatus
  progress: number
  error_type?: TrainingErrorType
  error_message?: string
  error_stack?: string
  cluster?: string
  updatedOn: Knex.Raw
}

class DbWrittableTrainingRepo implements WrittableTrainingRepository {
  constructor(protected _database: Knex, public transaction: Transaction | null = null) {}

  public async initialize(): Promise<void> {}
  public async teardown(): Promise<void> {}

  private get table() {
    if (this.transaction) {
      return this._database.table(TABLE_NAME).transacting(this.transaction)
    }
    return this._database.table(TABLE_NAME)
  }

  public set = async (trainId: TrainingId, trainState: TrainingState): Promise<void> => {
    const row = this._trainingToRow({ id: trainId, state: trainState })
    const { userId, modelId } = row

    if (await this.has(trainId)) {
      return this.table.where({ userId, modelId }).update(row)
    }
    return this.table.insert(row)
  }

  public has = async (trainId: TrainingId): Promise<boolean> => {
    const result = !!(await this.get(trainId))
    return result
  }

  public get = async (trainId: TrainingId): Promise<TrainingState | undefined> => {
    const tableId = this._trainIdToRow(trainId)
    const row: TableRow | undefined = await this.table.where(tableId).select('*').first()
    return row && this._rowToTraining(row).state
  }

  public query = async (query: Partial<TrainingState>): Promise<Training[]> => {
    const rows: TableRow[] = await this.table.where(this._trainStateToRow(query as TrainingState)).select('*')
    return rows.map(this._rowToTraining.bind(this))
  }

  public delete = async (trainId: TrainingId): Promise<void> => {
    const tableId = this._trainIdToRow(trainId)
    return this.table.where(tableId).delete()
  }

  private _trainingToRow(train: Training): TableRow {
    const id = this._trainIdToRow(train.id)
    const state = this._trainStateToRow(train.state)
    return {
      ...id,
      ...state
    }
  }

  private _trainIdToRow(trainId: TrainingId): TableId {
    const { appId, appSecret, ...modelId } = trainId
    const userId = this._makeUserId({ appId, appSecret })
    return {
      userId,
      modelId: modelIdService.toString(modelId)
    }
  }

  private _trainStateToRow = (state: TrainingState): Omit<TableRow, keyof TableId> => {
    const { progress, status, error } = state
    const { type: error_type, message: error_message, stackTrace: error_stack } = error || {}
    return {
      status,
      progress,
      error_type,
      error_message,
      error_stack,
      cluster: CLUSTER_ID,
      updatedOn: this._now()
    }
  }

  private _rowToTraining(row: TableRow): Training {
    const {
      userId,
      modelId: stringId,
      status,
      progress,
      error_type,
      error_message,
      error_stack,
      cluster,
      updatedOn
    } = row
    const { appId, appSecret } = this._parseUserId(userId)

    const modelId = modelIdService.fromString(stringId)
    const id: TrainingId = { appId, appSecret, ...modelId }

    const error: TrainingError | undefined =
      status === 'errored'
        ? {
            type: error_type!,
            message: error_message!,
            stackTrace: error_stack!
          }
        : undefined

    const state: TrainingState = { status, progress, error, cluster, updatedOn: new Date(updatedOn as any) }
    return { id, state }
  }

  private _now() {
    return this._database.raw('now()')
  }

  private _makeUserId(creds: http.Credentials) {
    const { appId, appSecret } = creds
    return [appId, appSecret].join(KEY_JOIN_CHAR)
  }

  private _parseUserId(userId: string): http.Credentials {
    const [appId, appSecret] = userId.split(KEY_JOIN_CHAR)
    return { appId, appSecret }
  }
}

export class DbTrainingRepository implements TrainingRepository {
  private _writtableTrainingRepo: DbWrittableTrainingRepo

  constructor(private _database: Knex, private _logger: Logger) {
    this._writtableTrainingRepo = new DbWrittableTrainingRepo(_database)
  }

  public initialize = async (): Promise<void> => {
    await this._createTableIfNotExists(this._database, TABLE_NAME, (table) => {
      table.string('userId').notNullable()
      table.string('modelId').notNullable()
      table.string('status').notNullable()
      table.float('progress').notNullable()
      table.string('error_type').nullable()
      table.string('error_message').nullable()
      table.string('error_stack').nullable()
      table.string('cluster').nullable()
      table.timestamp('updatedOn').notNullable()
      table.primary(['userId', 'modelId'])
    })
  }

  public teardown = async (): Promise<void> => {}

  private _createTableIfNotExists = async (knex: Knex, tableName: string, cb: Knex.KnexCallback): Promise<boolean> => {
    return knex.schema.hasTable(tableName).then((exists) => {
      if (exists) {
        return false
      }
      return knex.schema.createTable(tableName, cb).then(() => true)
    })
  }

  public inTransaction = async (action: TrainingTrx): Promise<void> => {
    await this._database.transaction(async (trx) => {
      const operation = async () => {
        try {
          const ctx = new DbWrittableTrainingRepo(this._database, trx)
          const res = await action(ctx)
          await trx.commit(res)
          return res
        } catch (err) {
          await trx.rollback(err)
        }
      }
      return Promise.race([operation(), timeout(TRANSACTION_TIMEOUT_MS)])
    })
  }

  public get = async (trainId: TrainingId): Promise<TrainingState | undefined> => {
    return this._writtableTrainingRepo.get(trainId)
  }

  public has = async (trainId: TrainingId): Promise<boolean> => {
    return this._writtableTrainingRepo.has(trainId)
  }

  public query = async (query: Partial<TrainingState>): Promise<Training[]> => {
    return this._writtableTrainingRepo.query(query)
  }

  public async delete(id: TrainingId): Promise<void> {
    return this._writtableTrainingRepo.delete(id)
  }
}
