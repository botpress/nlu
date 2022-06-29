import * as NLUEngine from '@botpress/nlu-engine'
import { Logger } from '@bpinternal/log4bot'
import Bluebird from 'bluebird'
import fse from 'fs-extra'
import _ from 'lodash'
import path from 'path'
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
    const basePathExists = fse.existsSync(this._basePath)
    if (!basePathExists) {
      throw new Error(`Model directory \"${this._basePath}\" does not exist.`)
    }
    return this._syncDir(path.join(this._basePath, MODELS_DIR))
  }

  public async teardown() {
    this._logger.debug('Model repo teardown...')
  }

  public async getModel(appId: string, modelId: NLUEngine.ModelId): Promise<Buffer | undefined> {
    const fileName = this._computeFilePath(appId, modelId)
    if (!fse.existsSync(fileName)) {
      return
    }
    return fse.readFile(fileName)
  }

  public async saveModel(appId: string, modelId: NLUEngine.ModelId, modelBuffer: Buffer): Promise<void | void[]> {
    const filePath = this._computeFilePath(appId, modelId)

    await this._syncDir(this._computeDirPath(appId))
    return fse.writeFile(filePath, modelBuffer)
  }

  public async listModels(appId: string, filters: Partial<NLUEngine.ModelId> = {}): Promise<NLUEngine.ModelId[]> {
    const dirPath = this._computeDirPath(appId)
    await this._syncDir(dirPath)
    const allFiles = await fse.readdir(dirPath)
    const allFileStats = await Bluebird.map(allFiles, async (f) => ({
      file: f,
      stat: await fse.stat(path.join(dirPath, f))
    }))

    const modelfileEndingPattern = `.${MODELS_EXT}`

    return _(allFileStats)
      .orderBy(({ stat }) => stat.mtime.getTime(), 'asc')
      .filter(({ file }) => file.endsWith(modelfileEndingPattern))
      .map(({ file }) => file.substring(0, file.lastIndexOf(modelfileEndingPattern)))
      .filter((stringId) => modelIdService.isId(stringId))
      .map((stringId) => modelIdService.fromString(stringId))
      .filter(filters)
      .value()
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
    const rawPath = path.join(dirPath, fname)
    return path.normalize(rawPath)
  }

  private _computeDirPath = (appId: string): string => {
    const appIdDir = encodeURIComponent(appId)
    const rawPath = path.join(this._basePath, MODELS_DIR, appIdDir)
    return path.normalize(rawPath)
  }

  private _syncDir = async (dirPath: string): Promise<void> => {
    if (fse.existsSync(dirPath)) {
      return
    }
    return fse.mkdir(dirPath)
  }
}
