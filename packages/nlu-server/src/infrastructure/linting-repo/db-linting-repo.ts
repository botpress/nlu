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
import Knex from 'knex'
import _ from 'lodash'
import { createTableIfNotExists } from '../../utils/database'
import { LintingRepository } from '.'

type IssuesRow = {
  id: string
  appId: string
  modelId: string
  code: string
  message: string
  data: object
}

type LintingId = {
  appId: string
  modelId: string
}

type LintingRow = LintingId & {
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

export class DatabaseLintingRepo implements LintingRepository {
  private _logger: Logger

  constructor(protected _database: Knex, logger: Logger, private _engine: NLUEngine.Engine) {
    this._logger = logger.sub('linting-repo')
  }

  public async initialize() {
    await createTableIfNotExists(this._database, ISSUES_TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary()
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.string('code').notNullable()
      table.text('message').notNullable()
      table.json('data').notNullable()
    })

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
  }

  private get _issues() {
    return this._database.table<IssuesRow>(ISSUES_TABLE_NAME)
  }

  private get _lintings() {
    return this._database.table<LintingRow>(LINTINGS_TABLE_NAME)
  }

  public async teardown() {
    this._logger.debug('Linting repo teardown...')
  }

  public async has(appId: string, modelId: NLUEngine.ModelId): Promise<boolean> {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingId = { appId, modelId: stringId }
    const linting = await this._lintings.select('*').where(lintingId).first()
    return !!linting
  }

  public async get(appId: string, modelId: NLUEngine.ModelId): Promise<LintingState | undefined> {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const lintingId: LintingId = { appId, modelId: stringId }
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

  public async set(appId: string, modelId: NLUEngine.ModelId, linting: LintingState): Promise<void> {
    const alreadyExists = await this.has(appId, modelId)
    if (alreadyExists) {
      return this.update(appId, modelId, linting)
    }
    return this._insert(appId, modelId, linting)
  }

  private async _insert(appId: string, modelId: NLUEngine.ModelId, linting: LintingState): Promise<void> {
    const { currentCount, issues, totalCount, status, error } = linting
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
    await this._lintings.insert(lintingTaskRow)

    const issueRows = issues.map(this._issueToRow.bind(this)).map((r) => ({ appId, modelId: stringId, ...r }))
    return this._upsertIssues(issueRows)
  }

  public async update(appId: string, modelId: NLUEngine.ModelId, linting: Partial<LintingState>): Promise<void> {
    const { currentCount, issues, totalCount, status, error } = linting
    const { type: error_type, message: error_message, stack: error_stack } = error ?? {}
    const stringId = NLUEngine.modelIdService.toString(modelId)

    const lintingTaskRow: Partial<LintingRow> = {
      appId,
      modelId: stringId,
      currentCount,
      totalCount,
      status,
      error_type,
      error_stack,
      error_message,
      updatedOn: new Date().toISOString()
    }
    await this._lintings.update(lintingTaskRow)

    if (issues) {
      const issueRows = issues.map(this._issueToRow.bind(this)).map((r) => ({ appId, modelId: stringId, ...r }))
      await this._upsertIssues(issueRows)
    }
  }

  /**
   * TODO: make this a single SQL call
   */
  private async _upsertIssues(issues: IssuesRow[]) {
    for (const issue of issues) {
      const alreadyExists = await this._issues.select('*').where({ id: issue.id }).first()
      if (!alreadyExists) {
        await this._issues.insert(issue)
      }
    }
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
