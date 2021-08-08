import { Logger } from '@botpress/logger'
import { http, TrainInput } from '@botpress/nlu-client'
import { ModelId, modelIdService } from '@botpress/nlu-engine'
import { GhostService, ScopedGhostService } from './ghost'

const FILE_EXT = 'json'
const TRAIN_SET_DIR = 'train-sets'

export class TrainingSetRepository {
  private _logger: Logger

  constructor(private _ghost: GhostService, logger: Logger) {
    this._logger = logger.sub('train-set-repo')
  }

  public async get(modelId: ModelId, options: http.Credentials): Promise<TrainInput | undefined> {
    const stringId = modelIdService.toString(modelId)
    const fExtension = this._getFileExtension(options.appSecret)
    const fname = `${stringId}.${fExtension}`

    const scopedGhost = this._getScopedGhostForAppID(options.appId)
    return scopedGhost.readFileAsObject<TrainInput>(TRAIN_SET_DIR, fname)
  }

  public async set(modelId: ModelId, options: http.Credentials, trainSet: TrainInput): Promise<void> {
    const stringId = modelIdService.toString(modelId)
    const fExtension = this._getFileExtension(options.appSecret)
    const fname = `${stringId}.${fExtension}`

    const scopedGhost = this._getScopedGhostForAppID(options.appId)

    return scopedGhost.upsertFile(TRAIN_SET_DIR, fname, JSON.stringify(trainSet, null, 2))
  }

  public async delete(modelId: ModelId, options: http.Credentials): Promise<void> {
    const stringId = modelIdService.toString(modelId)
    const fExtension = this._getFileExtension(options.appSecret)
    const fname = `${stringId}.${fExtension}`

    const scopedGhost = this._getScopedGhostForAppID(options.appId)

    return scopedGhost.deleteFile(TRAIN_SET_DIR, fname)
  }

  private _getScopedGhostForAppID(appId: string): ScopedGhostService {
    return appId ? this._ghost.forBot(appId) : this._ghost.root()
  }

  private _getFileExtension(appSecret: string) {
    const secretHash = this._computeSecretHash(appSecret)
    return `${secretHash}.${FILE_EXT}`
  }

  private _computeSecretHash(appSecret: string): string {
    return modelIdService.halfmd5(appSecret) // makes shorter file name than full regular md5
  }
}
