import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import { DatasetIssue, IssueCode, IssueData, IssueDefinition } from '@botpress/nlu-engine/src/hints'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { HintsRepository } from '.'

type HintsTableRow = {
  uuid: string
  appId: string
  modelId: string
  code: string
  message: string
  data: _.Dictionary<string>
  createdOn: Date
}

type HintsProcessId = {
  appId: string
  modelId: string
}

type HintsTasksRow = HintsProcessId & {
  totalCount: number
  currentCount: number
  createdOn: Date
  updatedOn: Date
}

const HINT_TABLE_NAME = 'nlu_hints'
const HINT_TASKS_TABLE_NAME = 'nlu_hints_task'

export class InMemoryHintRepo implements HintsRepository {
  private _logger: Logger

  private _hintsTable: HintsTableRow[] = []
  private _tasksTable: HintsTasksRow[] = [] // TODO: currently no way of telling time remaining or task progress

  constructor(logger: Logger, private _engine: NLUEngine.Engine) {
    this._logger = logger.sub('hints-repo')
  }

  public async initialize() {
    this._logger.debug('Hints repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Hints repo teardown...')
  }

  public async getHints(targetAppId: string, targetModelId: NLUEngine.ModelId): Promise<DatasetIssue<IssueCode>[]> {
    const targetStringId = NLUEngine.modelIdService.toString(targetModelId)
    const queryResult = this._hintsTable.filter(
      ({ appId, modelId }) => appId === targetAppId && modelId === targetStringId
    )

    const hints = queryResult.map(this._rowToHint.bind(this))
    return hints
  }

  public async appendHints(
    appId: string,
    modelId: NLUEngine.ModelId,
    hints: DatasetIssue<IssueCode>[]
  ): Promise<void | void[]> {
    const uuid = nanoid()
    const rows: HintsTableRow[] = hints.map((h) => {
      return {
        ...this._hintToRow(h),
        uuid,
        appId,
        modelId: NLUEngine.modelIdService.toString(modelId),
        createdOn: new Date()
      }
    })
    this._hintsTable.push(...rows)
  }

  private _rowToHint = (row: HintsTableRow): DatasetIssue<IssueCode> => {
    const { code: rawCode, data, message } = row

    const code = rawCode as IssueCode
    const definition: IssueDefinition<typeof code> | undefined = this._engine.getIssueDetails(code)

    if (!definition) {
      throw new Error(`Code "${rawCode}" found in table "${HINT_TABLE_NAME}" does not seem to exist.`)
    }

    return <DatasetIssue<IssueCode>>{
      ...definition,
      data: data as IssueData<typeof code>,
      message
    }
  }

  private _hintToRow = (
    hint: DatasetIssue<IssueCode>
  ): { code: string; message: string; data: _.Dictionary<string> } => {
    const { code, message, data } = hint
    return { code, message, data }
  }
}
