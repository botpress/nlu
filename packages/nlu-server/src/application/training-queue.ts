import { Logger } from '@botpress/logger'
import { TrainingState, TrainingErrorType, TrainInput, http } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import moment from 'moment'
import ms from 'ms'

import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingSetRepository } from '../infrastructure/train-set-repo'
import { TrainingId, TrainingRepository } from '../infrastructure/training-repo/typings'
import { serializeError } from '../utils/error-utils'
import { watchDog, WatchDog } from '../utils/watch-dog'
import { TrainingNotFoundError } from './errors'

const MAX_MODEL_PER_USER_PER_LANG = 1
const MAX_TRAINING_PER_INSTANCE = 2
const MAX_TRAINING_HEARTBEAT = ms('5m')

export default class TrainingQueue {
  private logger: Logger
  private task: WatchDog<[]>

  constructor(
    logger: Logger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainingRepo: TrainingRepository,
    private trainSetRepo: TrainingSetRepository,
    private _clusterId: string
  ) {
    this.logger = logger.sub('training-queue')
    this.task = watchDog(this._runTask.bind(this), MAX_TRAINING_HEARTBEAT / 2)
  }

  public async teardown() {
    return this.task.stop()
  }

  public queueTraining = async (modelId: NLUEngine.ModelId, credentials: http.Credentials, trainInput: TrainInput) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)

    const ts: TrainingState = {
      status: 'training-pending',
      progress: 0
    }

    await this.trainingRepo.inTransaction(async (repo) => {
      return repo.set({ ...modelId, ...credentials }, ts)
    })
    await this.trainSetRepo.set(modelId, credentials, trainInput)
    this.logger.info(`[${stringId}] Training Queued.`)

    // to return asap
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.task.run()
  }

  public cancelTraining = async (modelId: NLUEngine.ModelId, credentials: http.Credentials) => {
    return this.trainingRepo.inTransaction(async (repo) => {
      const trainId: TrainingId = { ...modelId, ...credentials }
      const currentTraining = await repo.get(trainId)
      if (!currentTraining) {
        throw new TrainingNotFoundError(modelId)
      }

      if (currentTraining.status === 'training-pending') {
        return repo.set(trainId, {
          ...currentTraining,
          status: 'canceled'
        })
      }

      if (currentTraining.cluster !== this._clusterId) {
        this.logger.debug(`Training ${modelId} was not launched on this instance`)
        return
      }

      if (currentTraining.status === 'training') {
        const trainingKey = NLUEngine.modelIdService.toString(modelId)
        return this.engine.cancelTraining(trainingKey)
      }
    })
  }

  private _runTask = async () => {
    return this.trainingRepo.inTransaction(async (repo) => {
      const localTrainings = await repo.query({ cluster: this._clusterId, status: 'training' })
      if (localTrainings.length >= MAX_TRAINING_PER_INSTANCE) {
        return
      }

      const zombieThreshold = moment().subtract(MAX_TRAINING_HEARTBEAT, 'ms').toDate()
      const zombieTrainings = await repo.queryOlderThan({ status: 'training' }, zombieThreshold)
      if (zombieTrainings.length) {
        this.logger.debug(`Queuing back ${zombieTrainings.length} trainings because they seem to be zombies.`)
        await Bluebird.each(zombieTrainings, (z) => repo.set(z.id, { ...z.state, status: 'training-pending' }))
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

      const { language: languageCode } = trainInput
      await this.modelRepo.pruneModels({ ...credentials, keep: MAX_MODEL_PER_USER_PER_LANG }, { languageCode }) // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.saveModel(model, credentials)

      this.logger.info(`[${stringId}] Training Done.`)

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
    } finally {
      await this.trainSetRepo.delete(modelId, credentials) // no need to keep this on file-system

      // to return asap
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.task.run()
    }
  }
}
