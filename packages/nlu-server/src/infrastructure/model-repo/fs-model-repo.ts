import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import fse from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { compressModel, decompressModel } from './compress-model'
import { ModelRepository, PruneOptions } from './typings'

const MODELS_DIR = 'models'
const MODELS_EXT = 'model'
const { modelIdService } = NLUEngine

export class FileSystemModelRepository implements ModelRepository {
  private _logger: Logger

  constructor(private _basePath: string, logger: Logger) {
    this._logger = logger.sub('model-repo')
  }

  public async initialize() {
    this._logger.debug('Model repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Model repo teardown...')
  }

  public async getModel(appId: string, modelId: NLUEngine.ModelId): Promise<NLUEngine.Model | undefined> {
    const fileName = this._computeFilePath(appId, modelId)
    if (!fse.existsSync(fileName)) {
      return
    }

    const buffer: Buffer = await fse.readFile(fileName)

    let mod
    try {
      mod = await decompressModel(buffer)
    } catch (err) {
      return
    }

    return mod
  }

  public async saveModel(appId: string, model: NLUEngine.Model): Promise<void | void[]> {
    const filePath = this._computeFilePath(appId, model.id)
    const buffer: Buffer = await compressModel(model)
    return fse.writeFile(filePath, buffer)
  }

  public async listModels(appId: string, filters: Partial<NLUEngine.ModelId> = {}): Promise<NLUEngine.ModelId[]> {
    const dirPath = this._computeDirPath(appId)
    const allFiles = await fse.readdir(dirPath)

    const modelfileEndingPattern = `.${MODELS_EXT}`
    const modelFiles = allFiles.filter((f) => f.endsWith(modelfileEndingPattern))

    const modelIds = modelFiles
      .map((f) => f.substring(0, f.lastIndexOf(modelfileEndingPattern)))
      .filter((stringId) => modelIdService.isId(stringId))
      .map((stringId) => modelIdService.fromString(stringId))

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
    const filePath = this._computeFilePath(appId, modelId)
    return fse.existsSync(filePath)
  }

  public async deleteModel(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    const filePath = this._computeFilePath(appId, modelId)
    return fse.unlink(filePath)
  }

  private _computeFilePath = (appId: string, modelId: NLUEngine.ModelId): string => {
    const dirPath = this._computeDirPath(appId)
    const stringId = modelIdService.toString(modelId)
    const fname = `${stringId}.${MODELS_EXT}`
    const rawPath = [dirPath, fname].join(path.sep)
    return path.normalize(rawPath)
  }

  private _computeDirPath = (appId: string): string => {
    const rawPath = [this._basePath, MODELS_DIR, appId].join(path.sep)
    return path.normalize(rawPath)
  }
}
