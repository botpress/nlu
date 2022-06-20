import { Logger } from '@bpinternal/log4bot'
import { IssueComputationSpeed, LintingState } from '@botpress/nlu-client'
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
    const { appId, modelId, speed } = id
    const taskId = this._makeLintingKey({ appId, modelId, speed })
    return !!this._lintingTable[taskId]
  }

  public async get(id: LintingId): Promise<Linting | undefined> {
    const { appId, modelId, speed } = id
    const taskId = this._makeLintingKey({ appId, modelId, speed })
    const linting = this._lintingTable[taskId]
    if (!linting) {
      return
    }
    return linting
  }

  public async set(linting: Linting): Promise<void> {
    const { appId, modelId, speed } = linting
    const current = await this.get({ appId, modelId, speed })
    const currentIssues = current?.issues ?? []
    const updatedIssues = _.uniqBy([...currentIssues, ...linting.issues], (i) => i.id)
    return this._set(appId, modelId, speed, { ...linting, issues: updatedIssues })
  }

  public async query(query: Partial<LintingState>): Promise<Linting[]> {
    const allLintings = this._getAllLintings()
    return this._filter(allLintings, query)
  }

  public queryOlderThan = async (query: Partial<LintingState>, threshold: Date): Promise<Linting[]> => {
    const allLintings = this._getAllLintings()
    const olderThan = allLintings.filter((t) => moment(t.updatedOn).isBefore(threshold))
    return this._filter(olderThan, query)
  }

  private _filter = (trainings: Linting[], filters: Partial<LintingState>) => {
    let queryResult: Linting[] = trainings
    for (const field in filters) {
      queryResult = queryResult.filter((t) => t[field] === filters[field])
    }
    return queryResult
  }

  private async _janitor() {
    const threshold = moment().subtract(MS_BEFORE_PRUNE, 'ms').toDate()

    const trainingsToPrune = await this.queryOlderThan({}, threshold)
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

  private _getAllLintings = (): (Linting & { updatedOn: Date })[] => {
    return _(this._lintingTable)
      .toPairs()
      .map(([key, value]) => ({ ...this._parseLintingKey(key), ...value }))
      .value()
  }

  private async _set(appId: string, modelId: NLUEngine.ModelId, speed: IssueComputationSpeed, linting: Linting) {
    const taskId = this._makeLintingKey({ appId, modelId, speed })
    this._lintingTable[taskId] = { ...linting, updatedOn: new Date() }
  }

  private _makeLintingKey = (id: LintingId): string => {
    const { appId, modelId, speed } = id
    const stringId = NLUEngine.modelIdService.toString(modelId)
    return [stringId, appId, speed].join(KEY_JOIN_CHAR)
  }

  private _parseLintingKey(key: string): LintingId {
    const [stringId, appId, speed] = key.split(KEY_JOIN_CHAR)
    const modelId = NLUEngine.modelIdService.fromString(stringId)
    return { modelId, appId, speed: speed as IssueComputationSpeed }
  }
}
