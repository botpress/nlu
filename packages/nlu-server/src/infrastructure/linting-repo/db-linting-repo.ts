import { Logger } from '@botpress/logger'
import {
  LintingErrorType,
  LintingStatus,
  DatasetIssue,
  IssueCode,
  IssueData,
  IssueDefinition,
  LintingError,
  IssueComputationSpeed
} from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import { Knex } from 'knex'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { createTableIfNotExists } from '../database-utils'
import { packTrainSet, unpackTrainSet } from '../dataset-serializer'
import { LintingRepository } from '.'
import { Linting, LintingId, LintingState } from './typings'

type IssuesRow = {
  id: string
  appId: string
  modelId: string
  code: string
  message: string
  data: object
}

type LintingRowId = {
  appId: string
  modelId: string
  speed: IssueComputationSpeed
}

type LintingRow = LintingRowId & {
  status: LintingStatus
  currentCount: number
  totalCount: number
  cluster: string
  dataset: string
  error_type?: LintingErrorType
  error_message?: string
  error_stack?: string
  startedOn: string
  updatedOn: string
}

const ISSUES_TABLE_NAME = 'nlu_dataset_issues'
const LINTINGS_TABLE_NAME = 'nlu_lintings'

const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

export class DatabaseLintingRepo implements LintingRepository {
  private _logger: Logger
  private _janitorIntervalId: NodeJS.Timeout | undefined

  private get _issues() {
    return this._database.table<IssuesRow>(ISSUES_TABLE_NAME)
  }

  private get _lintings() {
    return this._database.table<LintingRow>(LINTINGS_TABLE_NAME)
  }

  constructor(protected _database: Knex, logger: Logger, private _engine: NLUEngine.Engine) {
    this._logger = logger.sub('linting-repo')
  }

  public async initialize() {
    await createTableIfNotExists(this._database, LINTINGS_TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.string('speed').notNullable()
      table.string('status').notNullable()
      table.string('currentCount').notNullable()
      table.string('totalCount').notNullable()
      table.string('cluster').nullable()
      table.text('dataset').notNullable()
      table.string('error_type').nullable()
      table.text('error_message').nullable()
      table.text('error_stack').nullable()
      table.timestamp('startedOn').notNullable()
      table.timestamp('updatedOn').notNullable()
      table.primary(['appId', 'modelId', 'speed'])
    })

    await createTableIfNotExists(this._database, ISSUES_TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.string('id').primary()
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.string('speed').notNullable()
      table.string('code').notNullable()
      table.text('message').notNullable()
      table.json('data').notNullable()

      table
        .foreign(['appId', 'modelId', 'speed'])
        .references(['appId', 'modelId', 'speed'])
        .inTable(LINTINGS_TABLE_NAME)
        .onDelete('CASCADE')
    })

    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_MS_INTERVAL)
  }

  public async teardown() {
    this._logger.debug('Linting repo teardown...')
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
  }

  public async has(id: LintingId): Promise<boolean> {
    const { appId, modelId, speed } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingRowId = { appId, modelId: stringId, speed }
    const linting = await this._lintings.select('*').where(lintingId).first()
    return !!linting
  }

  public async get(id: LintingId): Promise<Linting | undefined> {
    const { appId, modelId, speed } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingRowId = { appId, modelId: stringId, speed }
    const lintingRow = await this._lintings.select('*').where(lintingId).first()
    if (!lintingRow) {
      return
    }
    return this._fromLintingRow(lintingRow)
  }

  public async set(linting: Linting): Promise<void> {
    const { modelId, appId, speed, currentCount, cluster, dataset, issues, totalCount, status, error } = linting
    const { type: error_type, message: error_message, stack: error_stack } = error ?? {}
    const stringId = NLUEngine.modelIdService.toString(modelId)

    const lintingTaskRow: LintingRow = {
      appId,
      modelId: stringId,
      speed,
      currentCount,
      totalCount,
      cluster,
      dataset: packTrainSet(dataset),
      status,
      error_type,
      error_stack,
      error_message,
      startedOn: new Date().toISOString(),
      updatedOn: new Date().toISOString()
    }

    await this._lintings
      .insert(lintingTaskRow)
      .onConflict(['appId', 'modelId', 'speed'])
      .merge([
        'status',
        'currentCount',
        'totalCount',
        'cluster',
        'dataset',
        'error_type',
        'error_message',
        'error_stack',
        'updatedOn'
      ])

    if (!issues.length) {
      return
    }

    const issueRows: IssuesRow[] = issues
      .map(this._issueToRow.bind(this))
      .map((r) => ({ speed, appId, modelId: stringId, ...r }))
    await this._issues.insert(issueRows).onConflict('id').merge()
  }

  public async query(query: Partial<LintingState>): Promise<Linting[]> {
    const { status, currentCount, totalCount } = query
    const rowFilters: Partial<LintingRow> = _.pickBy({ status, currentCount, totalCount }, (x) => x !== undefined)
    const rows: LintingRow[] = await this._lintings.where(rowFilters).select('*')
    return Bluebird.map(rows, this._fromLintingRow.bind(this))
  }

  public async queryOlderThan(query: Partial<LintingState>, treshold: Date): Promise<Linting[]> {
    const iso = treshold.toISOString()
    const { status, currentCount, totalCount } = query
    const rowFilters: Partial<LintingRow> = _.pickBy({ status, currentCount, totalCount }, (x) => x !== undefined)
    const rows: LintingRow[] = await this._lintings.where(rowFilters).where('updatedOn', '<=', iso).select('*')
    return Bluebird.map(rows, this._fromLintingRow.bind(this))
  }

  private _fromLintingRow = async (row: LintingRow): Promise<Linting> => {
    const {
      appId,
      modelId,
      speed,
      status,
      currentCount,
      cluster,
      dataset,
      totalCount,
      error_message,
      error_stack,
      error_type
    } = row

    const issueRows = await this._issues.select('*').where({ appId, modelId })
    const issues = issueRows.map(this._rowToIssue.bind(this))

    const error = this._toError(error_type, error_message, error_stack)
    const state: Linting = {
      appId,
      modelId: NLUEngine.modelIdService.fromString(modelId),
      speed,
      status,
      currentCount,
      totalCount,
      cluster,
      dataset: unpackTrainSet(dataset),
      error,
      issues
    }
    return state
  }

  private async _janitor() {
    const now = moment()
    const before = now.subtract({ milliseconds: MS_BEFORE_PRUNE })
    const nDeletions = await this._deleteOlderThan(before.toDate())
    if (nDeletions) {
      this._logger.debug(`Pruning ${nDeletions} linting state from database`)
    }
    return
  }

  private _deleteOlderThan = async (threshold: Date): Promise<number> => {
    const iso = threshold.toISOString()
    return this._lintings.where('updatedOn', '<=', iso).delete()
  }

  private _toError = (
    error_type: LintingErrorType | undefined,
    error_message: string | undefined,
    error_stack: string | undefined
  ): LintingError | undefined => {
    if (!error_type) {
      return
    }
    return { message: error_message!, stack: error_stack!, type: error_type! }
  }

  private _rowToIssue = (row: IssuesRow & { id: string }): DatasetIssue<IssueCode> => {
    const { code: rawCode, data, message, id } = row

    const code = rawCode as IssueCode
    const definition: IssueDefinition<typeof code> | undefined = this._engine.getIssueDetails(code)

    if (!definition) {
      throw new Error(`Code "${rawCode}" found in table "${ISSUES_TABLE_NAME}" does not seem to exist.`)
    }

    return <DatasetIssue<IssueCode>>{
      ...definition,
      id,
      data: data as IssueData<typeof code>,
      message
    }
  }

  private _issueToRow = (issue: DatasetIssue<IssueCode>): Omit<IssuesRow, 'appId' | 'modelId' | 'speed'> => {
    const { code, message, data, id } = issue
    return { id, code, message, data: data as object }
  }
}
