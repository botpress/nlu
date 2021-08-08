import { Logger } from '@botpress/logger'
import { TrainingState, TrainingErrorType, TrainInput, http } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'

import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingSetRepository } from '../infrastructure/train-set-repo'
import { TrainingRepository } from '../infrastructure/training-repo/typings'
import { serializeError } from '../utils/error-utils'

const MAX_MODEL_PER_USER_PER_LANG = 1
const MAX_TRAINING_PER_INSTANCE = 2

export default class TrainingQueue {
  private logger: Logger

  constructor(
    logger: Logger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainingRepo: TrainingRepository,
    private trainSetRepo: TrainingSetRepository,
    private _clusterId: string
  ) {
    this.logger = logger.sub('training-queue')
  }

  public queueTraining = async (modelId: NLUEngine.ModelId, credentials: http.Credentials, trainInput: TrainInput) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    this.logger.info(`[${stringId}] Training Queued.`)

    const ts: TrainingState = {
      status: 'training-pending',
      progress: 0
    }

    await this.trainingRepo.inTransaction(async (repo) => {
      return repo.set({ ...modelId, ...credentials }, ts)
    })
    await this.trainSetRepo.set(modelId, credentials, trainInput)

    // to return asap
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._runTask()
  }

  private _runTask = async () => {
    return this.trainingRepo.inTransaction(async (repo) => {
      const localTrainings = await repo.query({ cluster: this._clusterId, status: 'training' })
      if (localTrainings.length >= MAX_TRAINING_PER_INSTANCE) {
        return
      }

      const pendings = await repo.query({ status: 'training-pending' })
      if (pendings.length <= 0) {
        return
      }

      const { id, state } = pendings[0]
      const { appId, appSecret, ...modelId } = id
      state.status = 'training'

      await repo.set(id, state)

      this.logger.debug(`training ${NLUEngine.modelIdService.toString(id)} is about to start.`)
      // floating promise to return fast from task
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._train(modelId, { appId, appSecret })
    })
  }

  private _train = async (modelId: NLUEngine.ModelId, credentials: http.Credentials) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)

    const ts = await this.trainingRepo.get({ ...modelId, ...credentials })
    const trainInput = await this.trainSetRepo.get(modelId, credentials)
    if (!ts) {
      throw new Error("Invalid state: training state can't be found")
    }
    if (!trainInput) {
      throw new Error("Invalid state: training set can't be found")
    }

    const progressCallback = async (progress: number) => {
      ts.progress = progress
      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...modelId, ...credentials }, ts)
      })
    }

    try {
      const model = await this.engine.train(stringId, trainInput, { progressCallback })
      this.logger.info(`[${stringId}] Training Done.`)

      const { language: languageCode } = trainInput
      await this.modelRepo.pruneModels({ ...credentials, keep: MAX_MODEL_PER_USER_PER_LANG }, { languageCode }) // TODO: make the max amount of models on FS (by appId + lang) configurable
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

      const type: TrainingErrorType = NLUEngine.errors.isTrainingAlreadyStarted(err) ? 'already-started' : 'unknown'
      ts.status = 'errored'
      ts.error = { ...serializeError(err), type }

      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...modelId, ...credentials }, ts)
      })
      this.logger.attachError(err).error('an error occured during training')
      return
    } finally {
      // to prevent from loading the stack
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._runTask()
    }
  }
}
