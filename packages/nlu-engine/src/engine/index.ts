import Bluebird from 'bluebird'
import bytes from 'bytes'
import _ from 'lodash'
import LRUCache from 'lru-cache'
import ms from 'ms'
import sizeof from 'object-sizeof'
import { PredictOutput, TrainInput, Specifications } from 'src/typings'

import v8 from 'v8'
import { isListEntity, isPatternEntity } from '../guards'

import modelIdService from '../model-id-service'

import { TrainingOptions, LanguageConfig, Logger, ModelId, Model, Engine as IEngine } from '../typings'
import { deserializeKmeans } from './clustering'
import { initializeTools } from './initialize-tools'
import { getCtxFeatures } from './intents/context-featurizer'
import { OOSIntentClassifier } from './intents/oos-intent-classfier'
import { SvmIntentClassifier } from './intents/svm-intent-classifier'
import { deserializeModel, PredictableModel, serializeModel } from './model-serializer'
import { Predict, Predictors } from './predict-pipeline'
import SlotTagger from './slots/slot-tagger'
import { isPatternValid } from './tools/patterns-utils'
import { TrainInput as TrainingPipelineInput, TrainOutput as TrainingPipelineOutput } from './training-pipeline'
import { TrainingProcessPool } from './training-process-pool'
import { EntityCacheDump, ListEntity, PatternEntity, Tools } from './typings'

const DEFAULT_CACHE_SIZE = '850mb'
const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  cacheSize: DEFAULT_CACHE_SIZE
}

const DEFAULT_TRAINING_OPTIONS: TrainingOptions = {
  progressCallback: () => {},
  minProgressHeartbeat: ms('10s')
}

type EngineOptions = {
  cacheSize: string
}

export default class Engine implements IEngine {
  private _tools!: Tools
  private _trainingWorkerQueue!: TrainingProcessPool

  private _options: EngineOptions

  private modelsById: LRUCache<string, Predictors>

  private _trainLogger: Logger
  private _predictLogger: Logger

  constructor(private version: string, private _logger: Logger, opt: Partial<EngineOptions> = {}) {
    this._trainLogger = _logger.sub('training')
    this._predictLogger = _logger.sub('predict')

    this._options = { ...DEFAULT_ENGINE_OPTIONS, ...opt }

    this.modelsById = new LRUCache({
      max: this._parseCacheSize(this._options.cacheSize),
      length: sizeof // ignores size of functions, but let's assume it's small
    })

    const debugMsg =
      this.modelsById.max === Infinity
        ? 'model cache size is infinite'
        : `model cache size is: ${bytes(this.modelsById.max)}`

    this._logger.debug(debugMsg)
  }

  private _parseCacheSize = (cacheSize: string): number => {
    const defaultBytes = bytes(DEFAULT_CACHE_SIZE)
    if (!cacheSize) {
      return defaultBytes
    }

    const parsedCacheSize = bytes(cacheSize)
    if (!parsedCacheSize) {
      return defaultBytes
    }

    return Math.abs(parsedCacheSize)
  }

  public getLanguages() {
    return this._tools.getLanguages()
  }

  public getSpecifications(): Specifications {
    const languageServer = this._tools.getLangServerSpecs()
    return {
      engineVersion: this.version,
      languageServer
    }
  }

  public async initialize(config: LanguageConfig & { assetsPath: string }): Promise<void> {
    this._tools = await initializeTools(config, this._logger)
    this._trainingWorkerQueue = new TrainingProcessPool(this._trainLogger, config)
  }

  public hasModel(modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    return !!this.modelsById.get(stringId)
  }

  public async train(trainId: string, trainSet: TrainInput, opt: Partial<TrainingOptions> = {}): Promise<Model> {
    const { language, seed, entities, intents } = trainSet
    this._trainLogger.debug(`[${trainId}] Started ${language} training`)

    const options = { ...DEFAULT_TRAINING_OPTIONS, ...opt }

    const { progressCallback, minProgressHeartbeat } = options

    const list_entities = entities.filter(isListEntity).map(
      (e) =>
        <ListEntity & { cache: EntityCacheDump }>{
          name: e.name,
          fuzzyTolerance: e.fuzzy,
          sensitive: e.sensitive,
          synonyms: _.chain(e.values)
            .keyBy((e) => e.name)
            .mapValues((e) => e.synonyms)
            .value(),
          cache: [] // TODO: bring back list entitiy caching
        }
    )

    const pattern_entities: PatternEntity[] = entities
      .filter(isPatternEntity)
      .filter((ent) => isPatternValid(ent.regex))
      .map((ent) => ({
        name: ent.name,
        pattern: ent.regex,
        examples: ent.examples,
        matchCase: ent.case_sensitive,
        sensitive: !!ent.sensitive
      }))

    const contexts = _.chain(intents)
      .flatMap((i) => i.contexts)
      .uniq()
      .value()

    const pipelineIntents = intents
      .filter((x) => !!x.utterances)
      .map((x) => ({
        name: x.name,
        contexts: x.contexts,
        utterances: x.utterances,
        slot_definitions: x.slots
      }))

    const input: TrainingPipelineInput = {
      trainId,
      nluSeed: seed,
      languageCode: language,
      list_entities,
      pattern_entities,
      contexts,
      intents: pipelineIntents,
      minProgressHeartbeat
    }

    const startedAt = new Date()
    const output = await this._trainingWorkerQueue.startTraining(input, progressCallback)

    const {
      list_entities: coldEntities,
      tfidf,
      vocab,
      kmeans,
      ctx_model,
      intent_model_by_ctx,
      slots_model_by_intent
    } = output

    const modelId = modelIdService.makeId({
      ...trainSet,
      specifications: this.getSpecifications()
    })

    const model: PredictableModel = {
      id: modelId,
      startedAt,
      finishedAt: new Date(),
      data: {
        intents: pipelineIntents,
        languageCode: language,
        pattern_entities,
        contexts,
        tfidf,
        vocab,
        kmeans,
        ctx_model,
        intent_model_by_ctx,
        slots_model_by_intent,
        list_entities: coldEntities.map(({ cache, ...e }) => e) // rm cache to get smaller model
      }
    }

    this._trainLogger.debug(`[${trainId}] Successfully finished ${language} training`)

    return serializeModel(model)
  }

  public cancelTraining(trainSessionId: string): Promise<void> {
    return this._trainingWorkerQueue.cancelTraining(trainSessionId)
  }

  public async loadModel(serialized: Model) {
    const stringId = modelIdService.toString(serialized.id)
    this._logger.debug(`Load model ${stringId}`)

    if (this.hasModel(serialized.id)) {
      this._logger.debug(`Model ${stringId} already loaded.`)
      return
    }

    const model = deserializeModel(serialized)
    const modelCacheItem = await this._makePredictors(model.data)
    const modelSize = sizeof(modelCacheItem)
    const bytesModelSize = bytes(modelSize)
    this._logger.debug(`Size of model ${stringId} is ${bytesModelSize}`)

    if (modelSize >= this.modelsById.max) {
      const msg = `Can't load model ${stringId} as it is bigger than the maximum allowed size`
      const details = `model size: ${bytes(modelSize)}, max allowed: ${bytes(this.modelsById.max)}`
      const solution = 'You can increase cache size in the nlu config.'
      throw new Error(`${msg} (${details}). ${solution}`)
    }

    this.modelsById.set(stringId, modelCacheItem)

    this._logger.debug(`Model cache entries are: [${this.modelsById.keys().join(', ')}]`)
    const debug = this._getMemoryUsage()
    this._logger.debug(`Current memory usage: ${JSON.stringify(debug)}`)
  }

  private _getMemoryUsage = () => {
    const { heap_size_limit, total_available_size, used_heap_size } = v8.getHeapStatistics()
    return _.mapValues(
      {
        currentCacheSize: this.modelsById.length,
        heap_size_limit,
        total_available_size,
        used_heap_size
      },
      bytes
    )
  }

  public unloadModel(modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    this._logger.debug(`Unload model ${stringId}`)

    if (!this.hasModel(modelId)) {
      this._logger.debug(`No model with id ${stringId} was found in cache.`)
      return
    }

    this.modelsById.del(stringId)
    this._logger.debug('Model unloaded with success')
  }

  private async _makePredictors(modelData: PredictableModel['data']): Promise<Predictors> {
    const tools = this._tools

    const {
      intents,
      languageCode,
      pattern_entities,
      contexts,
      list_entities,
      tfidf,
      vocab,
      kmeans,
      ctx_model,
      intent_model_by_ctx,
      slots_model_by_intent
    } = modelData

    const warmKmeans = kmeans && deserializeKmeans(kmeans)

    const intent_classifier_per_ctx: _.Dictionary<OOSIntentClassifier> = await Bluebird.props(
      _.mapValues(intent_model_by_ctx, async (model) => {
        const intentClf = new OOSIntentClassifier(tools, this._predictLogger)
        await intentClf.load(model)
        return intentClf
      })
    )

    const ctx_classifier = new SvmIntentClassifier(tools, getCtxFeatures, this._predictLogger)
    await ctx_classifier.load(ctx_model)

    const slot_tagger_per_intent: _.Dictionary<SlotTagger> = await Bluebird.props(
      _.mapValues(slots_model_by_intent, async (model) => {
        const slotTagger = new SlotTagger(tools, this._predictLogger)
        await slotTagger.load(model)
        return slotTagger
      })
    )

    return {
      contexts,
      tfidf,
      vocab,
      lang: languageCode,
      intents,
      pattern_entities,
      list_entities,
      kmeans: warmKmeans,
      intent_classifier_per_ctx,
      ctx_classifier,
      slot_tagger_per_intent
    }
  }

  public async predict(text: string, modelId: ModelId): Promise<PredictOutput> {
    this._predictLogger.debug(`Predict for input: "${text}"`)

    const stringId = modelIdService.toString(modelId)
    const loaded = this.modelsById.get(stringId)
    if (!loaded) {
      throw new Error(`model ${stringId} not loaded`)
    }

    const language = modelId.languageCode
    return Predict(
      {
        language,
        text
      },
      this._tools,
      loaded
    )
  }

  public async detectLanguage(text: string, modelsByLang: _.Dictionary<ModelId>): Promise<string> {
    this._predictLogger.debug(`Detecting language for input: "${text}"`)

    const predictorsByLang = _.mapValues(modelsByLang, (id) => {
      const stringId = modelIdService.toString(id)
      return this.modelsById.get(stringId)
    })

    if (Object.values(predictorsByLang).some(_.isUndefined)) {
      const missingLangs = _(predictorsByLang)
        .pickBy((pred) => _.isUndefined(pred))
        .keys()
        .value()
      throw new Error(`No models loaded for the following languages: [${missingLangs.join(', ')}]`)
    }
    return this._tools.identify_language(text, predictorsByLang as _.Dictionary<Predictors>)
  }
}
