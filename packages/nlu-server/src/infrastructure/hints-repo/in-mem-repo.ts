import { Logger } from '@botpress/logger'
import { CheckingErrorType, CheckingState, CheckingStatus } from '@botpress/nlu-client/src/typings/hints'
import * as NLUEngine from '@botpress/nlu-engine'
import { DatasetIssue, IssueCode, IssueData, IssueDefinition } from '@botpress/nlu-engine/src/hints'
import _ from 'lodash'
import { HintsRepository } from '.'

type HintsTableRow = {
  appId: string
  modelId: string
  code: string
  message: string
  data: _.Dictionary<string>
}

type HintsTasksRow = {
  status: CheckingStatus
  currentCount: number
  totalCount: number
  error_type?: CheckingErrorType
  error_message?: string
  error_stack?: string
}

const HINT_TABLE_NAME = 'nlu_hints'
const HINT_TASKS_TABLE_NAME = 'nlu_hints_task'

export class InMemoryHintRepo implements HintsRepository {
  private _logger: Logger

  private _hintsTable: { [id: string]: HintsTableRow } = {}
  private _tasksTable: { [id: string]: HintsTasksRow } = {}

  constructor(logger: Logger, private _engine: NLUEngine.Engine) {
    this._logger = logger.sub('hints-repo')
  }

  public async initialize() {
    this._logger.debug('Hints repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Hints repo teardown...')
  }

  public async has(appId: string, modelId: NLUEngine.ModelId): Promise<boolean> {
    const taskId = this._taskId(appId, modelId)
    return !!this._tasksTable[taskId]
  }

  public async get(appId: string, modelId: NLUEngine.ModelId): Promise<CheckingState | undefined> {
    const taskId = this._taskId(appId, modelId)
    const task = this._tasksTable[taskId]
    if (!task) {
      return
    }

    const stringId = NLUEngine.modelIdService.toString(modelId)
    const hints = Object.entries(this._hintsTable)
      .map(([id, v]) => ({ id, ...v }))
      .filter((x) => x.appId === appId && x.modelId === stringId)
      .map(this._rowToHint.bind(this))

    const { status, currentCount, totalCount, error_message, error_stack, error_type } = task
    const error = error_type && { message: error_message!, stack: error_stack!, type: error_type! }
    const state: CheckingState = { status, currentCount, totalCount, error, hints }
    return state
  }

  public async set(appId: string, modelId: NLUEngine.ModelId, checking: CheckingState): Promise<void | void[]> {
    const { currentCount, hints, totalCount, status, error } = checking
    const { type: error_type, message: error_message, stack: error_stack } = error ?? {}

    const taskId = this._taskId(appId, modelId)
    const checkingTaskRow: HintsTasksRow = {
      currentCount,
      totalCount,
      status,
      error_type,
      error_stack,
      error_message
    }

    this._tasksTable[taskId] = checkingTaskRow

    for (const h of hints) {
      this._hintsTable[h.id] = {
        ...this._hintToRow(h),
        appId,
        modelId: NLUEngine.modelIdService.toString(modelId)
      }
    }
  }

  private _rowToHint = (row: HintsTableRow & { id: string }): DatasetIssue<IssueCode> => {
    const { code: rawCode, data, message, id } = row

    const code = rawCode as IssueCode
    const definition: IssueDefinition<typeof code> | undefined = this._engine.getIssueDetails(code)

    if (!definition) {
      throw new Error(`Code "${rawCode}" found in table "${HINT_TABLE_NAME}" does not seem to exist.`)
    }

    return <DatasetIssue<IssueCode>>{
      ...definition,
      id,
      data: data as IssueData<typeof code>,
      message
    }
  }

  private _hintToRow = (
    hint: DatasetIssue<IssueCode>
  ): { id: string; code: string; message: string; data: _.Dictionary<string> } => {
    const { code, message, data, id } = hint
    return { id, code, message, data }
  }

  private _taskId = (appId: string, modelId: NLUEngine.ModelId) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return `${appId}/${stringId}`
  }
}
