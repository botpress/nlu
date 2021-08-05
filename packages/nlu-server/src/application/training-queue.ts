import { Logger } from '@botpress/logger'
import { TrainingState, TrainingErrorType, TrainInput, http } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'

import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingRepository } from '../infrastructure/training-repo/typings'
import { serializeError } from '../utils/error-utils'

export default class TrainingQueue {
  private logger: Logger

  constructor(
    logger: Logger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainingRepo: TrainingRepository
  ) {
    this.logger = logger.sub('training-queue')
  }

  startTraining = async (modelId: NLUEngine.ModelId, credentials: http.Credentials, trainInput: TrainInput) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    this.logger.info(`[${stringId}] Training Started.`)

    const ts: TrainingState = {
      status: 'training-pending',
      progress: 0
    }
    await this.trainingRepo.inTransaction(async (repo) => {
      return repo.set({ ...modelId, ...credentials }, ts)
    })

    const progressCallback = async (progress: number) => {
      if (ts.status === 'training-pending') {
        ts.status = 'training'
      }
      ts.progress = progress
      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...modelId, ...credentials }, ts)
      })
    }

    try {
      const model = await this.engine.train(stringId, trainInput, { progressCallback })
      this.logger.info(`[${stringId}] Training Done.`)

      const { language: languageCode } = trainInput
      await this.modelRepo.pruneModels({ ...credentials, keep: 1 }, { languageCode }) // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.saveModel(model, credentials)
      ts.status = 'done'
      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...modelId, ...credentials }, ts)
      })
    } catch (err) {
      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${stringId}] Training Canceled.`)

        ts.status = 'canceled'
        await this.trainingRepo.inTransaction(async (repo) => {
          return repo.set({ ...modelId, ...credentials }, ts)
        })
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

      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...modelId, ...credentials }, ts)
      })
      this.logger.attachError(err).error('an error occured during training')
      return
    }
  }
}
