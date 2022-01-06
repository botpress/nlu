import { Logger } from '@botpress/logger'
import {
  LintingErrorType,
  LintingState,
  LintingStatus,
  DatasetIssue,
  IssueCode,
  IssueData,
  IssueDefinition
} from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { LintingRepository } from '.'

type IssuesRow = {
  appId: string
  modelId: string
  code: string
  message: string
  data: _.Dictionary<string>
}

type LintingRow = {
  status: LintingStatus
  currentCount: number
  totalCount: number
  error_type?: LintingErrorType
  error_message?: string
  error_stack?: string
}

const ISSUES_TABLE_NAME = 'nlu_dataset_issues'
const LINTINGS_TABLE_NAME = 'nlu_lintings'

export class InMemoryLintingRepo implements LintingRepository {
  private _logger: Logger

  private _issuesTable: { [id: string]: IssuesRow } = {}
  private _lintingTable: { [id: string]: LintingRow } = {}

  constructor(logger: Logger, private _engine: NLUEngine.Engine) {
    this._logger = logger.sub('linting-repo')
  }

  public async initialize() {
    this._logger.debug('Linting repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Linting repo teardown...')
  }

  public async has(appId: string, modelId: NLUEngine.ModelId): Promise<boolean> {
    const taskId = this._taskId(appId, modelId)
    return !!this._lintingTable[taskId]
  }

  public async get(appId: string, modelId: NLUEngine.ModelId): Promise<LintingState | undefined> {
    const taskId = this._taskId(appId, modelId)
    const task = this._lintingTable[taskId]
    if (!task) {
      return
    }

    const stringId = NLUEngine.modelIdService.toString(modelId)
    const issues = Object.entries(this._issuesTable)
      .map(([id, v]) => ({ id, ...v }))
      .filter((x) => x.appId === appId && x.modelId === stringId)
      .map(this._rowToIssue.bind(this))

    const { status, currentCount, totalCount, error_message, error_stack, error_type } = task
    const error = error_type && { message: error_message!, stack: error_stack!, type: error_type! }
    const state: LintingState = { status, currentCount, totalCount, error, issues }
    return state
  }

  public async set(appId: string, modelId: NLUEngine.ModelId, linting: LintingState): Promise<void> {
    return this._set(appId, modelId, linting)
  }

  public async update(appId: string, modelId: NLUEngine.ModelId, linting: Partial<LintingState>): Promise<void> {
    const current = await this.get(appId, modelId)
    if (!current) {
      throw new Error('Cannot update linting state as it was not created first')
    }
    return this._set(appId, modelId, { ...current, ...linting })
  }

  private async _set(appId: string, modelId: NLUEngine.ModelId, linting: LintingState) {
    const { currentCount, issues, totalCount, status, error } = linting
    const { type: error_type, message: error_message, stack: error_stack } = error ?? {}

    const taskId = this._taskId(appId, modelId)
    const lintingTaskRow: LintingRow = {
      currentCount,
      totalCount,
      status,
      error_type,
      error_stack,
      error_message
    }

    this._lintingTable[taskId] = lintingTaskRow

    for (const issue of issues) {
      this._issuesTable[issue.id] = {
        ...this._issueToRow(issue),
        appId,
        modelId: NLUEngine.modelIdService.toString(modelId)
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

  private _issueToRow = (
    issue: DatasetIssue<IssueCode>
  ): { id: string; code: string; message: string; data: _.Dictionary<string> } => {
    const { code, message, data, id } = issue
    return { id, code, message, data }
  }

  private _taskId = (appId: string, modelId: NLUEngine.ModelId) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return `${appId}/${stringId}`
  }
}
