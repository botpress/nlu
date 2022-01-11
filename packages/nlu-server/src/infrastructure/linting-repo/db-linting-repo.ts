import { Logger } from '@botpress/logger'
import {
  LintingErrorType,
  LintingState,
  LintingStatus,
  DatasetIssue,
  IssueCode,
  IssueData,
  IssueDefinition,
  LintingError
} from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import { Knex } from 'knex'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { createTableIfNotExists } from '../../utils/database'
import { LintingRepository } from '.'
import { Linting, LintingId } from './typings'

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
}

type LintingRow = LintingRowId & {
  status: LintingStatus
  currentCount: number
  totalCount: number
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
      table.string('status').notNullable()
      table.string('currentCount').notNullable()
      table.string('totalCount').notNullable()
      table.string('error_type').nullable()
      table.text('error_message').nullable()
      table.text('error_stack').nullable()
      table.timestamp('startedOn').notNullable()
      table.timestamp('updatedOn').notNullable()
      table.primary(['appId', 'modelId'])
    })

    await createTableIfNotExists(this._database, ISSUES_TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.string('id').primary()
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.string('code').notNullable()
      table.text('message').notNullable()
      table.json('data').notNullable()

      table
        .foreign(['appId', 'modelId'])
        .references(['appId', 'modelId'])
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
    const { appId, modelId } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingRowId = { appId, modelId: stringId }
    const linting = await this._lintings.select('*').where(lintingId).first()
    return !!linting
  }

  // TODO: express this method as a single query using a right join
  public async get(id: LintingId): Promise<LintingState | undefined> {
    const { appId, modelId } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingRowId = { appId, modelId: stringId }
    const linting = await this._lintings.select('*').where(lintingId).first()
    if (!linting) {
      return
    }

    const issueRows = await this._issues.select('*').where(lintingId)
    const issues = issueRows.map(this._rowToIssue.bind(this))

    const { status, currentCount, totalCount, error_message, error_stack, error_type } = linting
    const error = this._toError(error_type, error_message, error_stack)
    const state: LintingState = { status, currentCount, totalCount, error, issues }
    return state
  }

  public async set(linting: Linting): Promise<void> {
    const { modelId, appId, currentCount, issues, totalCount, status, error } = linting
    const { type: error_type, message: error_message, stack: error_stack } = error ?? {}
    const stringId = NLUEngine.modelIdService.toString(modelId)

    const lintingTaskRow: LintingRow = {
      appId,
      modelId: stringId,
      currentCount,
      totalCount,
      status,
      error_type,
      error_stack,
      error_message,
      startedOn: new Date().toISOString(),
      updatedOn: new Date().toISOString()
    }

    await this._lintings
      .insert(lintingTaskRow)
      .onConflict(['appId', 'modelId'])
      .merge(['status', 'currentCount', 'totalCount', 'error_type', 'error_message', 'error_stack', 'updatedOn'])

    if (!issues.length) {
      return
    }

    const issueRows = issues.map(this._issueToRow.bind(this)).map((r) => ({ appId, modelId: stringId, ...r }))
    await this._issues.insert(issueRows).onConflict('id').merge()
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

  private _issueToRow = (issue: DatasetIssue<IssueCode>): Omit<IssuesRow, 'appId' | 'modelId'> => {
    const { code, message, data, id } = issue
    return { id, code, message, data: data as object }
  }
}
