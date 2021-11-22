import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import Knex from 'knex'
import _ from 'lodash'
import { createTableIfNotExists } from '../../utils/database'
import { compressModel, decompressModel } from './compress-model'
import { ModelRepository, PruneOptions } from './typings'

const TABLE_NAME = 'nlu_models'
const { modelIdService } = NLUEngine

interface TableKey {
  appId: string
  modelId: string
}

interface TableRow extends TableKey {
  content: Buffer
}

type Column = keyof TableRow

export class DbModelRepository implements ModelRepository {
  private _logger: Logger

  constructor(private _database: Knex, logger: Logger) {
    this._logger = logger.sub('model-repo')
  }

  private get table() {
    return this._database.table<TableRow>(TABLE_NAME)
  }

  public async initialize() {
    this._logger.debug('Model repo initializing...')
    await createTableIfNotExists(this._database, TABLE_NAME, (table: Knex.CreateTableBuilder) => {
      table.string('appId').notNullable()
      table.string('modelId').notNullable()
      table.binary('content').notNullable()
      table.primary(['appId', 'modelId'])
    })
  }

  public async teardown() {
    this._logger.debug('Model repo teardown...')
    return this._database.destroy()
  }

  public async getModel(appId: string, modelId: NLUEngine.ModelId): Promise<NLUEngine.Model | undefined> {
    const stringId = modelIdService.toString(modelId)
    const filter: Partial<TableRow> = { appId, modelId: stringId }
    const row = await this.table.select('*').where(filter).first()
    if (!row) {
      return
    }

    const { content } = row
    const buffer = Buffer.from(content)

    let mod
    try {
      mod = await decompressModel(buffer)
    } catch (err) {
      return
    }

    return mod
  }

  public async saveModel(appId: string, model: NLUEngine.Model): Promise<void | void[]> {
    const modelExists = await this.exists(appId, model.id)
    const content: Buffer = await compressModel(model)
    const modelId = modelIdService.toString(model.id)
    if (modelExists) {
      const filter: TableKey = { appId, modelId }
      const row: Partial<TableRow> = { content }
      await this.table.update(row).where(filter)
      return
    }
    const row: TableRow = { appId, modelId, content }
    return this.table.insert(row)
  }

  public async listModels(appId: string, filters: Partial<NLUEngine.ModelId> = {}): Promise<NLUEngine.ModelId[]> {
    const rowfilters: Partial<TableKey> = { appId }
    const columns: Column[] = ['appId', 'modelId']
    const queryResult: Partial<TableRow>[] = await this.table.select(columns).where(rowfilters)
    const hasModelId = (q: Partial<TableRow>): q is { modelId: string } => !!q.modelId
    const modelIds = queryResult.filter(hasModelId).map(({ modelId }) => modelIdService.fromString(modelId))
    return _.filter(modelIds, filters)
  }

  public async pruneModels(
    appId: string,
    options: PruneOptions,
    filters: Partial<NLUEngine.ModelId> = {}
  ): Promise<NLUEngine.ModelId[]> {
    const models = await this.listModels(appId, filters)
    const { keep } = options
    const toPrune = models.slice(keep)
    await Bluebird.each(toPrune, (m) => this.deleteModel(appId, m))
    return toPrune
  }

  public async exists(appId: string, modelId: NLUEngine.ModelId): Promise<boolean> {
    const stringId = modelIdService.toString(modelId)
    const filter: TableKey = { appId, modelId: stringId }
    const columns: Column[] = ['appId', 'modelId']
    const row: TableKey | undefined = await this.table.select(columns).where(filter).first()
    return !!row
  }

  public async deleteModel(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    const stringId = modelIdService.toString(modelId)
    const filter: TableKey = { appId, modelId: stringId }
    await this.table.delete().where(filter)
  }
}
