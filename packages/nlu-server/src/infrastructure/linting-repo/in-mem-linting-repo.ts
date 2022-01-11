import { Logger } from '@botpress/logger'
import { LintingState } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { LintingRepository } from '.'
import { Linting, LintingId } from './typings'

export class InMemoryLintingRepo implements LintingRepository {
  private _logger: Logger

  private _lintingTable: { [id: string]: LintingState } = {}

  constructor(logger: Logger) {
    this._logger = logger.sub('linting-repo')
  }

  public async initialize() {
    this._logger.debug('Linting repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Linting repo teardown...')
  }

  public async has(id: LintingId): Promise<boolean> {
    const { appId, modelId } = id
    const taskId = this._taskId(appId, modelId)
    return !!this._lintingTable[taskId]
  }

  public async get(id: LintingId): Promise<LintingState | undefined> {
    const { appId, modelId } = id
    const taskId = this._taskId(appId, modelId)
    const linting = this._lintingTable[taskId]
    if (!linting) {
      return
    }
    return linting
  }

  public async set(linting: Linting): Promise<void> {
    const { appId, modelId } = linting
    const current = await this.get({ appId, modelId })
    const currentIssues = current?.issues ?? []
    const updatedIssues = _.uniqBy([...currentIssues, ...linting.issues], (i) => i.id)
    return this._set(appId, modelId, { ...linting, issues: updatedIssues })
  }

  private async _set(appId: string, modelId: NLUEngine.ModelId, linting: LintingState) {
    const taskId = this._taskId(appId, modelId)
    this._lintingTable[taskId] = linting
  }

  private _taskId = (appId: string, modelId: NLUEngine.ModelId) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return `${appId}/${stringId}`
  }
}
