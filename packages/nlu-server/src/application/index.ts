import { Logger } from '@botpress/logger'
import {
  TrainingState,
  PredictOutput,
  TrainInput,
  ServerInfo,
  TrainingStatus,
  LintingState,
  IssueComputationSpeed
} from '@botpress/nlu-client'
import { Engine, ModelId, modelIdService, errors as engineErrors } from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import { ModelTransferDisabled } from '../api/errors'
import { TrainingRepository, TrainingListener, Training } from '../infrastructure'
import { LintingRepository } from '../infrastructure/linting-repo'
import { ModelRepository } from '../infrastructure/model-repo'
import { ApplicationObserver } from './app-observer'
import {
  ModelDoesNotExistError,
  TrainingNotFoundError,
  LangServerCommError,
  DucklingCommError,
  InvalidModelSpecError,
  DatasetValidationError,
  LintingNotFoundError
} from './errors'
import { LintingQueue } from './linting-queue'
import { deserializeModel } from './serialize-model'
import { TrainingQueue } from './training-queue'

type AppOptions = {
  modelTransferEnabled: boolean
}

export class Application extends ApplicationObserver {
  private _logger: Logger

  constructor(
    private _modelRepo: ModelRepository,
    private _trainingRepo: TrainingRepository,
    private _lintingRepo: LintingRepository,
    private _trainingQueue: TrainingQueue,
    private _lintingQueue: LintingQueue,
    private _engine: Engine,
    private _serverVersion: string,
    baseLogger: Logger,
    private _opts: Partial<AppOptions> = {}
  ) {
    super()
    this._logger = baseLogger.sub('app')
  }

  public async initialize() {
    await this._modelRepo.initialize()
    await this._trainingRepo.initialize()
    await this._trainingQueue.initialize()
    await this._lintingRepo.initialize()
    await this._lintingQueue.initialize()
    this._trainingQueue.addListener(this._listenTrainingUpdates)
  }

  public async teardown() {
    await this._modelRepo.teardown()
    await this._trainingRepo.teardown()
    await this._trainingQueue.teardown()
    this._trainingQueue.removeListener(this._listenTrainingUpdates)
  }

  public getLocalTrainingCount() {
    return this._trainingQueue.getLocalTrainingCount()
  }

  public getInfo(): ServerInfo {
    const specs = this._engine.getSpecifications()
    const languages = this._engine.getLanguages()
    const version = this._serverVersion

    const { modelTransferEnabled } = this._opts
    return { specs, languages, version, modelTransferEnabled: !!modelTransferEnabled }
  }

  public async getModelWeights(appId: string, modelId: ModelId): Promise<Buffer> {
    if (!this._opts.modelTransferEnabled) {
      throw new ModelTransferDisabled()
    }

    const modelWeights = await this._modelRepo.getModel(appId, modelId)
    if (!modelWeights) {
      throw new ModelDoesNotExistError(appId, modelId)
    }

    return modelWeights
  }

  public async setModelWeights(appId: string, modelWeights: Buffer) {
    if (!this._opts.modelTransferEnabled) {
      throw new ModelTransferDisabled()
    }
    // TODO: validate model weights
    const model = await deserializeModel(modelWeights)
    return this._modelRepo.saveModel(appId, model.id, modelWeights)
  }

  public async getModels(appId: string): Promise<ModelId[]> {
    return this._modelRepo.listModels(appId, this._getSpecFilter())
  }

  public async pruneModels(appId: string): Promise<ModelId[]> {
    const modelIds = await this._modelRepo.pruneModels(appId, { keep: 0 }, this._getSpecFilter())

    for (const modelId of modelIds) {
      if (this._engine.hasModel(modelId)) {
        this._engine.unloadModel(modelId)
      }
      await this._trainingRepo.delete({ modelId, appId })
    }

    return modelIds
  }

  public async startTraining(appId: string, trainInput: TrainInput): Promise<ModelId> {
    const modelId = modelIdService.makeId({
      ...trainInput,
      specifications: this._engine.getSpecifications()
    })

    const stringId = modelIdService.toString(modelId)
    const key = `${appId}/${stringId}`
    const { issues } = await this._engine.lint(key, trainInput, {
      minSpeed: 'fastest',
      minSeverity: 'critical',
      runInMainProcess: true
    })

    if (!!issues.length) {
      throw new DatasetValidationError(issues)
    }

    await this._trainingQueue.queueTraining(appId, modelId, trainInput)
    return modelId
  }

  public async getAllTrainings(
    appId: string,
    languageCode?: string
  ): Promise<(TrainingState & { modelId: ModelId })[]> {
    const allTrainings = await this._trainingRepo.query({ appId })
    const trainingsOfLang = !languageCode
      ? allTrainings
      : allTrainings.filter((t) => t.modelId.languageCode === languageCode)

    const sessions = _.map(trainingsOfLang, (training) => {
      const { status, error, progress, modelId } = training
      return { modelId, status, error, progress }
    })

    const hasACorrespondingTraining = (m: ModelId) => sessions.some(({ modelId }) => modelIdService.areSame(modelId, m))

    const filters = { ...this._getSpecFilter(), languageCode }
    const models = await this._modelRepo.listModels(appId, _.pickBy(filters, _.negate(_.isUndefined)))
    const doneSessions = models
      .filter(_.negate(hasACorrespondingTraining))
      .map((modelId) => ({ modelId, status: <TrainingStatus>'done', progress: 1 }))

    return [...sessions, ...doneSessions]
  }

  public async getTrainingState(appId: string, modelId: ModelId): Promise<TrainingState> {
    const training = await this._trainingRepo.get({ modelId, appId })
    if (training) {
      const { status, error, progress } = training
      return { status, error, progress }
    }

    const { specificationHash: currentSpec } = this._getSpecFilter()
    if (modelId.specificationHash !== currentSpec) {
      throw new InvalidModelSpecError(modelId, currentSpec)
    }

    const modelExists = await this._modelRepo.exists(appId, modelId)
    if (!modelExists) {
      throw new TrainingNotFoundError(appId, modelId)
    }

    return {
      status: 'done',
      progress: 1
    }
  }

  public async cancelTraining(appId: string, modelId: ModelId): Promise<void> {
    return this._trainingQueue.cancelTraining(appId, modelId)
  }

  public async cancelLinting(appId: string, modelId: ModelId, speed: IssueComputationSpeed): Promise<void> {
    return this._lintingQueue.cancelLinting(appId, modelId, speed)
  }

  public async predict(appId: string, modelId: ModelId, utterances: string[]): Promise<PredictOutput[]> {
    const modelExists: boolean = await this._modelRepo.exists(appId, modelId)
    if (!modelExists) {
      throw new ModelDoesNotExistError(appId, modelId)
    }

    const { specificationHash: currentSpec } = this._getSpecFilter()
    if (modelId.specificationHash !== currentSpec) {
      throw new InvalidModelSpecError(modelId, currentSpec)
    }

    await this._loadModelIfNeeded(appId, modelId)

    try {
      const predictions = await Bluebird.map(utterances, (utterance) => this._engine.predict(utterance, modelId))
      return predictions
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      if (err instanceof engineErrors.LangServerError) {
        throw new LangServerCommError(err)
      }
      if (err instanceof engineErrors.DucklingServerError) {
        throw new DucklingCommError(err)
      }
      throw thrown
    }
  }

  public async detectLanguage(appId: string, modelIds: ModelId[], utterances: string[]): Promise<string[]> {
    for (const modelId of modelIds) {
      const modelExists: boolean = await this._modelRepo.exists(appId, modelId)
      if (!modelExists) {
        throw new ModelDoesNotExistError(appId, modelId)
      }

      const { specificationHash: currentSpec } = this._getSpecFilter()
      if (modelId.specificationHash !== currentSpec) {
        throw new InvalidModelSpecError(modelId, currentSpec)
      }

      await this._loadModelIfNeeded(appId, modelId)
    }

    const missingModels = modelIds.filter((m) => !this._engine.hasModel(m))

    if (missingModels.length) {
      const stringMissingModels = missingModels.map(modelIdService.toString).join(', ')

      const CACHE_TOO_SMALL_WARNING = `
About to detect language but your model cache seems to small to contains all models simultaneously. 
The following models are missing [${stringMissingModels}].
You can increase your cache size by the CLI or config.
          `
      this._logger.warn(CACHE_TOO_SMALL_WARNING)
    }

    const loadedModels = modelIds.filter((m) => this._engine.hasModel(m))
    const detectedLanguages: string[] = await Bluebird.map(utterances, async (utterance) => {
      const detectedLanguage = await this._engine.detectLanguage(
        utterance,
        _.keyBy(loadedModels, (m) => m.languageCode)
      )
      return detectedLanguage
    })

    return detectedLanguages
  }

  public async startLinting(appId: string, speed: IssueComputationSpeed, trainInput: TrainInput): Promise<ModelId> {
    const modelId = modelIdService.makeId({
      ...trainInput,
      specifications: this._engine.getSpecifications()
    })

    await this._lintingQueue.queueLinting(appId, modelId, speed, trainInput)
    return modelId
  }

  public async getLintingState(appId: string, modelId: ModelId, speed: IssueComputationSpeed): Promise<LintingState> {
    const linting = await this._lintingRepo.get({ appId, modelId, speed })
    if (linting) {
      const { status, error, currentCount, totalCount, issues } = linting
      return { status, error, currentCount, totalCount, issues }
    }

    const { specificationHash: currentSpec } = this._getSpecFilter()
    if (modelId.specificationHash !== currentSpec) {
      throw new InvalidModelSpecError(modelId, currentSpec)
    }

    throw new LintingNotFoundError(appId, modelId, speed)
  }

  private _listenTrainingUpdates: TrainingListener = async (training: Training) => {
    this.emit('training_update', training)
  }

  private _loadModelIfNeeded = async (appId: string, modelId: ModelId) => {
    if (!this._engine.hasModel(modelId)) {
      const modelReadStartTime = Date.now()

      const modelBuffer = await this._modelRepo.getModel(appId, modelId)
      if (!modelBuffer) {
        throw new ModelDoesNotExistError(appId, modelId)
      }

      const modelLoadStartTime = Date.now()

      const model = await deserializeModel(modelBuffer)
      await this._engine.loadModel(model)

      const modelLoadEndTime = Date.now()

      const readTime = modelLoadStartTime - modelReadStartTime
      const loadTime = modelLoadEndTime - modelLoadStartTime
      const totalTime = modelLoadEndTime - modelReadStartTime

      const strId = this._toString(appId, modelId)
      this._logger.debug(
        `[${strId}] Reading model from storage took ${readTime} ms and loading it in memory took ${loadTime} ms. The whole operation took ${totalTime} ms`
      )
      this.emit('model_loaded', { appId, modelId, readTime, loadTime, totalTime })
    }
  }

  private _toString = (appId: string, modelId: ModelId) => {
    const strModelId = modelIdService.toString(modelId)
    return `${appId}/${strModelId}`
  }

  private _getSpecFilter = (): { specificationHash: string } => {
    const specifications = this._engine.getSpecifications()
    const specFilter = modelIdService.briefId({ specifications }) as { specificationHash: string }
    return specFilter
  }
}
