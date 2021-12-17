import { Logger } from '@botpress/logger'
import {
  TrainingState,
  PredictOutput,
  TrainInput,
  ServerInfo,
  TrainingStatus,
  LintingState,
  DatasetIssue,
  IssueCode
} from '@botpress/nlu-client'
import { Engine, ModelId, modelIdService, errors as engineErrors } from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import { LintingRepository } from '../infrastructure/linting-repo'
import { ModelRepository } from '../infrastructure/model-repo'
import { ReadonlyTrainingRepository, TrainingListener } from '../infrastructure/training-repo/typings'
import {
  ModelDoesNotExistError,
  TrainingNotFoundError,
  LangServerCommError,
  DucklingCommError,
  InvalidModelSpecError,
  DatasetValidationError,
  LintingNotFoundError
} from './errors'
import TrainingQueue from './training-queue'

export class Application {
  private _logger: Logger

  constructor(
    private _modelRepo: ModelRepository,
    private _trainingRepo: ReadonlyTrainingRepository,
    private _lintingRepo: LintingRepository,
    private _trainingQueue: TrainingQueue,
    private _engine: Engine,
    private _serverVersion: string,
    baseLogger: Logger
  ) {
    this._logger = baseLogger.sub('app')
  }

  public addTrainingListener(listener: TrainingListener) {
    this._trainingQueue.addListener(listener)
  }

  public removeTrainingListener(listener: TrainingListener) {
    this._trainingQueue.removeListener(listener)
  }

  public async initialize() {
    await this._modelRepo.initialize()
    await this._trainingRepo.initialize()
    await this._trainingQueue.initialize()
  }

  public async teardown() {
    await this._modelRepo.teardown()
    await this._trainingRepo.teardown()
    await this._trainingQueue.teardown()
  }

  public getLocalTrainingCount() {
    return this._trainingQueue.getLocalTrainingCount()
  }

  public getInfo(): ServerInfo {
    const specs = this._engine.getSpecifications()
    const languages = this._engine.getLanguages()
    const version = this._serverVersion
    return { specs, languages, version }
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
    const { issues } = await this._engine.lint(key, trainInput, { minSpeed: 'fastest' })

    const criticalErrors = issues.filter((i) => i.severity === 'critical')
    if (!!criticalErrors.length) {
      throw new DatasetValidationError(criticalErrors)
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

    const model = await this._modelRepo.getModel(appId, modelId)
    if (!model) {
      throw new TrainingNotFoundError(modelId)
    }

    return {
      status: 'done',
      progress: 1
    }
  }

  public async cancelTraining(appId: string, modelId: ModelId): Promise<void> {
    return this._trainingQueue.cancelTraining(appId, modelId)
  }

  public async predict(appId: string, modelId: ModelId, utterances: string[]): Promise<PredictOutput[]> {
    const modelExists: boolean = await this._modelRepo.exists(appId, modelId)
    if (!modelExists) {
      throw new ModelDoesNotExistError(modelId)
    }

    const { specificationHash: currentSpec } = this._getSpecFilter()
    if (modelId.specificationHash !== currentSpec) {
      throw new InvalidModelSpecError(modelId, currentSpec)
    }

    if (!this._engine.hasModel(modelId)) {
      const model = await this._modelRepo.getModel(appId, modelId)
      if (!model) {
        throw new ModelDoesNotExistError(modelId)
      }

      await this._engine.loadModel(model)
    }

    try {
      const predictions = await Bluebird.map(utterances, (utterance) => this._engine.predict(utterance, modelId))
      return predictions
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      if (engineErrors.isLangServerError(err)) {
        throw new LangServerCommError(err)
      }
      if (engineErrors.isDucklingServerError(err)) {
        throw new DucklingCommError(err)
      }
      throw thrown
    }
  }

  public async detectLanguage(appId: string, modelIds: ModelId[], utterances: string[]): Promise<string[]> {
    for (const modelId of modelIds) {
      const modelExists: boolean = await this._modelRepo.exists(appId, modelId)
      if (!modelExists) {
        throw new ModelDoesNotExistError(modelId)
      }

      const { specificationHash: currentSpec } = this._getSpecFilter()
      if (modelId.specificationHash !== currentSpec) {
        throw new InvalidModelSpecError(modelId, currentSpec)
      }

      if (!this._engine.hasModel(modelId)) {
        const model = await this._modelRepo.getModel(appId, modelId)
        if (!model) {
          throw new ModelDoesNotExistError(modelId)
        }
        await this._engine.loadModel(model)
      }
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

  public async lintDataset(appId: string, trainInput: TrainInput): Promise<ModelId> {
    const modelId = modelIdService.makeId({
      ...trainInput,
      specifications: this._engine.getSpecifications()
    })

    const stringId = modelIdService.toString(modelId)
    const key = `${appId}/${stringId}`

    // unhandled promise to return asap
    void this._engine.lint(key, trainInput, {
      minSpeed: 'slow',
      progressCallback: (current: number, total: number, issues: DatasetIssue<IssueCode>[]) => {
        return this._lintingRepo.set(appId, modelId, {
          status: 'linting',
          currentCount: current,
          totalCount: total,
          issues
        })
      }
    })

    return modelId
  }

  public async getLintingState(appId: string, modelId: ModelId): Promise<LintingState> {
    const state = await this._lintingRepo.get(appId, modelId)
    if (!state) {
      throw new LintingNotFoundError(modelId)
    }
    return state
  }

  private _getSpecFilter = (): { specificationHash: string } => {
    const specifications = this._engine.getSpecifications()
    const specFilter = modelIdService.briefId({ specifications }) as { specificationHash: string }
    return specFilter
  }
}
