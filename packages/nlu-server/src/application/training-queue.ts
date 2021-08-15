import { Logger } from '@botpress/logger'
import { TrainingErrorType, TrainInput, http, TrainingStatus, TrainingError } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'

import { ModelRepository } from '../infrastructure/model-repo'
import {
  TrainingId,
  TrainingRepository,
  TrainingState,
  WrittableTrainingRepository
} from '../infrastructure/training-repo/typings'
import { serializeError } from '../utils/error-utils'
import { watchDog, WatchDog } from '../utils/watch-dog'
import { TrainingNotFoundError } from './errors'

const MAX_MODEL_PER_USER_PER_LANG = 1
const MAX_TRAINING_PER_INSTANCE = 2
const MAX_TRAINING_HEARTBEAT = ms('1m')

export default class TrainingQueue {
  private logger: Logger
  private task!: WatchDog<[]>

  constructor(
    logger: Logger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainingRepo: TrainingRepository,
    private _clusterId: string
  ) {
    this.logger = logger.sub('training-queue')
  }

  public async initialize() {
    this.task = watchDog(this._runTask.bind(this), MAX_TRAINING_HEARTBEAT / 2)
  }

  public async teardown() {
    return this.task.stop()
  }

  public queueTraining = async (modelId: NLUEngine.ModelId, credentials: http.Credentials, trainInput: TrainInput) => {
    const trainId: TrainingId = { ...modelId, ...credentials }
    const trainKey = this._toKey(trainId)

    await this.trainingRepo.inTransaction(async (repo) => {
      const id = { ...modelId, ...credentials }
      const currentTraining = await repo.get(id)
      if (currentTraining && currentTraining.state.status === 'training') {
        this.logger.debug(`Not queuing because training "${trainKey}" already started...`)
        return // TODO: log something for trianing already started...
      }

      const state: TrainingState = {
        status: 'training-pending',
        progress: 0,
        cluster: this._clusterId
      }

      this.logger.debug(`Queuing "${trainKey}"`)
      return repo.set({
        id,
        state,
        set: trainInput
      })
    }, 'queueTraining')
    this.logger.info(`[${trainKey}] Training Queued.`)

    // to return asap
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.runTask()
  }

  public async cancelTraining(modelId: NLUEngine.ModelId, credentials: http.Credentials): Promise<void> {
    const trainId: TrainingId = { ...modelId, ...credentials }
    const trainKey = this._toKey(trainId)

    return this.trainingRepo.inTransaction(async (repo) => {
      const currentTraining = await repo.get(trainId)
      if (!currentTraining) {
        throw new TrainingNotFoundError(modelId)
      }

      const { state: currentState, set } = currentTraining

      const zombieTrainings = await this._getZombies(repo)
      const isZombie = !!zombieTrainings.find((t) => this._areSame(t.id, trainId))

      if (currentState.status === 'training-pending' || isZombie) {
        const newState: TrainingState = {
          ...currentState,
          status: <TrainingStatus>'canceled'
        }

        return repo.set({
          id: trainId,
          state: newState,
          set
        })
      }

      if (currentState.cluster !== this._clusterId) {
        this.logger.debug(`Training "${trainKey}" was not launched on this instance`)
        return
      }

      if (currentState.status === 'training') {
        return this.engine.cancelTraining(trainKey)
      }
    }, 'cancelTraining')
  }

  protected async runTask() {
    return this.task.run()
  }

  private _runTask = async () => {
    return this.trainingRepo.inTransaction(async (repo) => {
      const localTrainings = await repo.query({ cluster: this._clusterId, status: 'training' })
      if (localTrainings.length >= MAX_TRAINING_PER_INSTANCE) {
        return
      }

      const zombieTrainings = await this._getZombies(repo)
      if (zombieTrainings.length) {
        this.logger.debug(`Queuing back ${zombieTrainings.length} trainings because they seem to be zombies.`)
        const error: TrainingError = {
          type: 'zombie-training',
          message: `Zombie Training: Training had not been updated in more than ${MAX_TRAINING_HEARTBEAT} ms.`
        }
        const newState: TrainingState = { status: 'errored', progress: 0, cluster: this._clusterId, error }
        await Bluebird.each(zombieTrainings, (z) => repo.set({ ...z, state: newState }))
      }

      const pendings = await repo.query({ status: 'training-pending' })
      if (pendings.length <= 0) {
        return
      }

      const { id, state, set } = pendings[0]
      const { appId, appSecret, ...modelId } = id
      state.status = 'training'

      await repo.set({ id, state, set })

      // floating promise to return fast from task
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._train(modelId, { appId, appSecret })
    }, '_runTask')
  }

  private _areSame(t1: TrainingId, t2: TrainingId) {
    return t1.appId === t2.appId && t1.appSecret === t2.appSecret && NLUEngine.modelIdService.areSame(t1, t2)
  }

  private _getZombies = (repo: WrittableTrainingRepository) => {
    const zombieThreshold = moment().subtract(MAX_TRAINING_HEARTBEAT, 'ms').toDate()
    return repo.queryOlderThan({ status: 'training' }, zombieThreshold)
  }

  private _train = async (modelId: NLUEngine.ModelId, credentials: http.Credentials) => {
    const trainId = { ...modelId, ...credentials }
    const trainKey = this._toKey(trainId)

    this.logger.debug(`training "${trainKey}" is about to start.`)

    const training = await this.trainingRepo.get(trainId)
    if (!training) {
      throw new Error("Invalid state: training state can't be found")
    }

    const { state: ts, set: trainInput } = training

    const progressCb = async (progress: number) => {
      ts.status = 'training' // TODO: shouldnt be needed but there is a bug somewhere
      ts.progress = progress
      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...training, state: ts })
      }, 'progressCallback')
    }
    const throttledCb = _.throttle(progressCb, ms('5s'))

    try {
      const trainKey = this._toKey({ ...modelId, ...credentials })
      const model = await this.engine.train(trainKey, trainInput, { progressCallback: throttledCb })
      throttledCb.flush()

      const { language: languageCode } = trainInput
      await this.modelRepo.pruneModels({ ...credentials, keep: MAX_MODEL_PER_USER_PER_LANG }, { languageCode }) // TODO: make the max amount of models on FS (by appId + lang) configurable
      await this.modelRepo.saveModel(model, credentials)

      this.logger.info(`[${trainKey}] Training Done.`)

      ts.status = 'done'
      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...training, state: ts })
      }, '_train_done')
    } catch (err) {
      throttledCb.cancel()

      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${trainKey}] Training Canceled.`)

        ts.status = 'canceled'
        await this.trainingRepo.inTransaction(async (repo) => {
          return repo.set({ ...training, state: ts })
        }, '_train_canceled')
        return
      }

      const type: TrainingErrorType = NLUEngine.errors.isTrainingAlreadyStarted(err) ? 'already-started' : 'unknown'
      ts.status = 'errored'
      ts.error = { ...serializeError(err), type }

      await this.trainingRepo.inTransaction(async (repo) => {
        return repo.set({ ...training, state: ts })
      }, '_train_errored')

      if (type === 'unknown') {
        this.logger.attachError(err).error('an error occured during training')
      }
    } finally {
      // to return asap
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.runTask()
    }
  }

  private _toKey(id: TrainingId) {
    const stringId = NLUEngine.modelIdService.toString(id)
    return `${id.appId}/${stringId}`
  }
}
