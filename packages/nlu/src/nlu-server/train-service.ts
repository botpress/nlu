import { TrainingProgress, TrainingErrorType, TrainInput, http } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'

import { serializeError } from '../utils/error-utils'
import { ILogger } from '../utils/logger/typings'
import { ModelRepository } from './model-repo'
import TrainSessionService from './train-session-service'

export default class TrainService {
  constructor(
    private logger: ILogger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainSessionService: TrainSessionService
  ) {}

  train = async (modelId: NLUEngine.ModelId, credentials: http.Credentials, trainInput: TrainInput) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    this.logger.info(`[${stringId}] Training Started.`)

    const ts: TrainingProgress = {
      status: 'training-pending',
      progress: 0
    }
    this.trainSessionService.setTrainingSession(modelId, credentials, ts)

    const progressCallback = (progress: number) => {
      if (ts.status === 'training-pending') {
        ts.status = 'training'
      }
      ts.progress = progress
      this.trainSessionService.setTrainingSession(modelId, credentials, ts)
    }

    try {
      const model = await this.engine.train(stringId, trainInput, { progressCallback })
      this.logger.info(`[${stringId}] Training Done.`)

      const { language: languageCode } = trainInput
      await this.modelRepo.pruneModels({ ...credentials, keep: 1 }, { languageCode }) // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.saveModel(model, credentials)
      ts.status = 'done'
      this.trainSessionService.setTrainingSession(modelId, credentials, ts)
      this.trainSessionService.releaseTrainingSession(modelId, credentials)
    } catch (err) {
      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${stringId}] Training Canceled.`)

        ts.status = 'canceled'
        this.trainSessionService.setTrainingSession(modelId, credentials, ts)
        this.trainSessionService.releaseTrainingSession(modelId, credentials)
        return
      }

      let type: TrainingErrorType = 'unknown'
      if (NLUEngine.errors.isTrainingAlreadyStarted(err)) {
        this.logger.error('training already started')
        type = 'already-started'
        return
      }

      ts.status = 'errored'
      ts.error = { ...serializeError(err), type }

      this.trainSessionService.setTrainingSession(modelId, credentials, ts)
      this.trainSessionService.releaseTrainingSession(modelId, credentials)
      this.logger.attachError(err).error('an error occured during training')
      return
    }
  }
}
