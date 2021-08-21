import { Logger } from '@botpress/logger'
import { TrainingState, http, PredictOutput, TrainInput, ServerInfo } from '@botpress/nlu-client'
import { Engine, ModelId, modelIdService } from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import _ from 'lodash'
import { ModelRepository } from '../infrastructure/model-repo'
import { ReadonlyTrainingRepository } from '../infrastructure/training-repo/typings'
import { ModelDoesNotExistError, TrainingNotFoundError } from './errors'
import TrainingQueue from './training-queue'

export class Application {
  private _logger: Logger

  constructor(
    private _modelRepo: ModelRepository,
    private _trainingRepo: ReadonlyTrainingRepository,
    private _trainingQueue: TrainingQueue,
    private _engine: Engine,
    private _serverVersion: string,
    baseLogger: Logger
  ) {
    this._logger = baseLogger.sub('app')
  }

  public async initialize() {
    await this._modelRepo.initialize()
    await this._trainingRepo.initialize()
  }

  public async teardown() {
    await this._trainingRepo.teardown()
    await this._trainingQueue.teardown()
  }

  public getInfo(): ServerInfo {
    const health = this._engine.getHealth()
    const specs = this._engine.getSpecifications()
    const languages = this._engine.getLanguages()
    const version = this._serverVersion
    return { health, specs, languages, version }
  }

  public async getModels(appId: string): Promise<ModelId[]> {
    return this._modelRepo.listModels(appId)
  }

  public async pruneModels(appId: string): Promise<ModelId[]> {
    const modelIds = await this._modelRepo.pruneModels(appId, { keep: 0 })

    for (const modelId of modelIds) {
      if (this._engine.hasModel(modelId)) {
        this._engine.unloadModel(modelId)
      }
      await this._trainingRepo.delete({ ...modelId, appId })
    }

    return modelIds
  }

  public async startTraining(appId: string, trainInput: TrainInput): Promise<ModelId> {
    const modelId = modelIdService.makeId({
      ...trainInput,
      specifications: this._engine.getSpecifications()
    })

    await this._trainingQueue.queueTraining(appId, modelId, trainInput)
    return modelId
  }

  public async getTrainingState(appId: string, modelId: ModelId): Promise<TrainingState> {
    const session = await this._trainingRepo.get({ ...modelId, appId })
    if (session) {
      const { state } = session
      return state
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

    if (!this._engine.hasModel(modelId)) {
      const model = await this._modelRepo.getModel(appId, modelId)
      if (!model) {
        throw new ModelDoesNotExistError(modelId)
      }

      await this._engine.loadModel(model)
    }

    const predictions = await Bluebird.map(utterances as string[], async (utterance) => {
      const detectedLanguage = await this._engine.detectLanguage(utterance, { [modelId.languageCode]: modelId })
      const { entities, contexts, spellChecked } = await this._engine.predict(utterance, modelId)
      return { entities, contexts, spellChecked, detectedLanguage }
    })

    return predictions
  }

  public async detectLanguage(appId: string, modelIds: ModelId[], utterances: string[]): Promise<string[]> {
    for (const modelId of modelIds) {
      const modelExists: boolean = await this._modelRepo.exists(appId, modelId)
      if (!modelExists) {
        throw new ModelDoesNotExistError(modelId)
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
      const stringMissingModels = missingModels.map(modelIdService.toString)
      this._logger.warn(
        `About to detect language but your model cache seems to small to contains all models simultaneously. The following models are missing [${stringMissingModels.join(
          ', '
        )}. You can increase your cache size by the CLI or config.]`
      )
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
}
