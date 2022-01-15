import { Logger } from '@botpress/logger'
import { LintingState } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { LintingRepository } from '.'
import { Linting, LintingId } from './typings'

type LintEntry = Linting & { updatedOn: Date }

const KEY_JOIN_CHAR = '\u2581'
const JANITOR_MS_INTERVAL = ms('1m') // 60,000 ms
const MS_BEFORE_PRUNE = ms('1h')

export class InMemoryLintingRepo implements LintingRepository {
  private _logger: Logger
  private _janitorIntervalId: NodeJS.Timeout | undefined
  private _lintingTable: { [id: string]: LintEntry } = {}

  constructor(logger: Logger) {
    this._logger = logger.sub('linting-repo')
  }

  public async initialize() {
    this._logger.debug('Linting repo initializing...')
    this._janitorIntervalId = setInterval(this._janitor.bind(this), JANITOR_MS_INTERVAL)
  }

  public async teardown() {
    this._logger.debug('Linting repo teardown...')
    this._janitorIntervalId && clearInterval(this._janitorIntervalId)
  }

  public async has(id: LintingId): Promise<boolean> {
    const { appId, modelId } = id
    const taskId = this._makeLintingKey({ appId, modelId })
    return !!this._lintingTable[taskId]
  }

  public async get(id: LintingId): Promise<Linting | undefined> {
    const { appId, modelId } = id
    const taskId = this._makeLintingKey({ appId, modelId })
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

  public async query(query: Partial<LintingState>): Promise<Linting[]> {
    throw new Error('Method not implemented.')
  }

  public async queryOlderThan(query: Partial<LintingState>, treshold: Date): Promise<Linting[]> {
    throw new Error('Method not implemented.')
  }

  private _janitor() {
    const threshold = moment().subtract(MS_BEFORE_PRUNE, 'ms').toDate()

    const trainingsToPrune = this._queryOlderThan(threshold)
    if (trainingsToPrune.length) {
      this._logger.debug(`Pruning ${trainingsToPrune.length} linting state from memory`)
    }

    for (const t of trainingsToPrune) {
      this._delete(t)
    }
  }

  private _delete = (id: LintingId) => {
    const key = this._makeLintingKey(id)
    delete this._lintingTable[key]
  }

  private _queryOlderThan = (threshold: Date): Linting[] => {
    const allLintings = this._getAllLintings()
    return allLintings.filter((t) => moment(t.updatedOn).isBefore(threshold))
  }

  private _getAllLintings = (): (Linting & { updatedOn: Date })[] => {
    return _(this._lintingTable)
      .toPairs()
      .map(([key, value]) => ({ ...this._parseLintingKey(key), ...value }))
      .value()
  }

  private async _set(appId: string, modelId: NLUEngine.ModelId, linting: Linting) {
    const taskId = this._makeLintingKey({ appId, modelId })
    this._lintingTable[taskId] = { ...linting, updatedOn: new Date() }
  }

  private _makeLintingKey = (id: LintingId) => {
    const { appId, modelId } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return [stringId, appId].join(KEY_JOIN_CHAR)
  }

  private _parseLintingKey(key: string): LintingId {
    const [stringId, appId] = key.split(KEY_JOIN_CHAR)
    const modelId = NLUEngine.modelIdService.fromString(stringId)
    return { modelId, appId }
  }
}
