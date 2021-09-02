import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import fse, { WriteStream } from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { Stream } from 'stream'
import tar from 'tar'
import tmp from 'tmp'
import { GhostService, ScopedGhostService } from './ghost'

interface PruneOptions {
  keep: number
}

const MODELS_DIR = './models'
const MODELS_EXT = 'model'

const { modelIdService } = NLUEngine

export class ModelRepository {
  private _logger: Logger

  constructor(private _ghost: GhostService, logger: Logger) {
    this._logger = logger.sub('model-repo')
  }

  async initialize() {
    this._logger.debug('Model service initializing...')
  }

  public async hasModel(appId: string, modelId: NLUEngine.ModelId): Promise<boolean> {
    return !!(await this.getModel(appId, modelId))
  }

  /**
   *
   * @param modelId The desired model id
   * @returns the corresponding model
   */
  public async getModel(appId: string, modelId: NLUEngine.ModelId): Promise<NLUEngine.Model | undefined> {
    const scopedGhost = this._getScopedGhostForAppID(appId)

    const stringId = modelIdService.toString(modelId)
    const fname = `${stringId}.${MODELS_EXT}`

    if (!(await scopedGhost.fileExists(MODELS_DIR, fname))) {
      return
    }
    const buffStream = new Stream.PassThrough()
    buffStream.end(await scopedGhost.readFileAsBuffer(MODELS_DIR, fname))
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })

    const tarStream = tar.x({ cwd: tmpDir.name, strict: true }, ['model']) as WriteStream
    buffStream.pipe(tarStream)
    await new Promise((resolve) => tarStream.on('close', resolve))

    const modelBuff = await fse.readFile(path.join(tmpDir.name, 'model'))
    let mod
    try {
      mod = JSON.parse(modelBuff.toString())
    } catch (err) {
      await scopedGhost.deleteFile(MODELS_DIR, fname)
    } finally {
      tmpDir.removeCallback()
      return mod
    }
  }

  public async saveModel(appId: string, model: NLUEngine.Model): Promise<void | void[]> {
    const serialized = JSON.stringify(model)

    const stringId = modelIdService.toString(model.id)
    const fname = `${stringId}.${MODELS_EXT}`

    const scopedGhost = this._getScopedGhostForAppID(appId)

    // TODO replace that logic with in-memory streams
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const tmpFileName = path.join(tmpDir.name, 'model')
    await fse.writeFile(tmpFileName, serialized)
    const archiveName = path.join(tmpDir.name, fname)
    await tar.create(
      {
        file: archiveName,
        cwd: tmpDir.name,
        portable: true,
        gzip: true
      },
      ['model']
    )
    const buffer = await fse.readFile(archiveName)
    await scopedGhost.upsertFile(MODELS_DIR, fname, buffer)
    tmpDir.removeCallback()
  }

  public async listModels(appId: string, filters: Partial<NLUEngine.ModelId> = {}): Promise<NLUEngine.ModelId[]> {
    const scopedGhost = this._getScopedGhostForAppID(appId)
    const files = await scopedGhost.directoryListing(MODELS_DIR, `*.${MODELS_EXT}`, undefined, undefined, {
      sortOrder: {
        column: 'modifiedOn',
        desc: true
      }
    })

    const modelIds = files
      .map((f) => f.substring(0, f.lastIndexOf(`.${MODELS_EXT}`)))
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
    const scopedGhost = this._getScopedGhostForAppID(appId)

    const stringId = modelIdService.toString(modelId)
    const fname = `${stringId}.${MODELS_EXT}`

    return scopedGhost.fileExists(MODELS_DIR, fname)
  }

  public async deleteModel(appId: string, modelId: NLUEngine.ModelId): Promise<void> {
    const scopedGhost = this._getScopedGhostForAppID(appId)

    const stringId = modelIdService.toString(modelId)
    const fname = `${stringId}.${MODELS_EXT}`

    return scopedGhost.deleteFile(MODELS_DIR, fname)
  }

  private _getScopedGhostForAppID(appId: string): ScopedGhostService {
    return appId ? this._ghost.forBot(appId) : this._ghost.root()
  }
}
