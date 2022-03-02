import Bluebird from 'bluebird'
import _ from 'lodash'
import { ModelOf } from 'src/component'
import { Override } from 'src/utils/override-type'
import * as MLToolkit from '../ml/toolkit'
import { Logger } from '../typings'

import { watchDog } from '../utils/watch-dog'

import { computeKmeans, serializeKmeans } from './clustering'
import { CustomEntityExtractor } from './entities/custom-extractor'
import { MultiThreadCustomEntityExtractor } from './entities/custom-extractor/multi-thread-extractor'
import { warmEntityCache } from './entities/entity-cache'
import { makeListEntityModel } from './entities/list-entity-model'
import { getCtxFeatures } from './intents/context-featurizer'
import { OOSIntentClassifier } from './intents/oos-intent-classfier'
import { SvmIntentClassifier } from './intents/svm-intent-classifier'
import { SlotTagger } from './slots/slot-tagger'

import tfidf from './tools/tfidf'
import {
  ColdListEntityModel,
  EntityExtractionResult,
  Intent,
  ListEntityWithCache,
  PatternEntity,
  SerializedKmeansResult,
  TFIDF,
  Token2Vec,
  Tools as LanguageTools,
  WarmedListEntityModel
} from './typings'
import Utterance, { buildUtteranceBatch, UtteranceToken } from './utterance/utterance'

export type TrainInput = {
  trainId: string
  nluSeed: number
  languageCode: string
  pattern_entities: PatternEntity[]
  list_entities: ListEntityWithCache[]
  contexts: string[]
  intents: Intent<string>[]
  minProgressHeartbeat: number
}

type PreprocessTrainStep = Override<
  TrainInput,
  {
    list_entities: WarmedListEntityModel[]
    intents: Intent<Utterance>[]
    vocabVectors: Token2Vec
  }
>
type TfIdfTrainStep = PreprocessTrainStep & { tfIdf: TFIDF }
type ClusterTrainStep = TfIdfTrainStep & { kmeans?: MLToolkit.KMeans.KmeansResult }
type SerialTrainOuput = ClusterTrainStep

export type TrainOutput = {
  list_entities: ColdListEntityModel[]
  tfidf: TFIDF
  vocab: string[]
  contexts: string[]
  kmeans: SerializedKmeansResult | undefined
  ctx_model: ModelOf<SvmIntentClassifier>
  intent_model_by_ctx: _.Dictionary<ModelOf<OOSIntentClassifier>>
  slots_model_by_intent: _.Dictionary<ModelOf<SlotTagger>>
}

type Tools = {
  logger: Logger
} & LanguageTools

type progressCB = (p?: number) => void

/**
 * ##############################
 * ### Step 1 : Preprocessing ###
 * ##############################
 */
async function makeWarmListEntityModel(
  entity: ListEntityWithCache,
  languageCode: string,
  tools: Tools
): Promise<WarmedListEntityModel> {
  const cache = warmEntityCache(entity.cache)
  const model = await makeListEntityModel(entity, languageCode, tools)
  return { ...model, cache }
}

async function processIntents(
  intents: Intent<string>[],
  languageCode: string,
  tools: Tools
): Promise<Intent<Utterance>[]> {
  return Bluebird.map(intents, async (intent) => {
    const cleaned = intent.utterances.map((u) => u.trim())
    const utterances = await buildUtteranceBatch(cleaned, languageCode, tools, [])
    return { ...intent, utterances }
  })
}

function buildVectorsVocab(intents: Intent<Utterance>[]): _.Dictionary<number[]> {
  return _.chain(intents)
    .flatMap((intent: Intent<Utterance>) => intent.utterances)
    .flatMap((utt: Utterance) => utt.tokens)
    .reduce((vocab, tok: UtteranceToken) => {
      vocab[tok.toString({ lowerCase: true })] = <number[]>tok.vector
      return vocab
    }, {} as Token2Vec)
    .value()
}

async function preprocessInput(input: TrainInput, tools: Tools): Promise<PreprocessTrainStep> {
  input = _.cloneDeep(input)
  const list_entities = await Bluebird.map(input.list_entities, (list) =>
    makeWarmListEntityModel(list, input.languageCode, tools)
  )

  const intents = await processIntents(input.intents, input.languageCode, tools)
  const vocabVectors = buildVectorsVocab(intents)

  return {
    ...input,
    list_entities,
    intents,
    vocabVectors
  }
}

async function tfidfTokens(input: PreprocessTrainStep): Promise<TfIdfTrainStep> {
  const tfidfInput = input.intents.reduce(
    (tfidfInput, intent) => ({
      ...tfidfInput,
      [intent.name]: _.flatMapDeep(intent.utterances.map((u) => u.tokens.map((t) => t.toString({ lowerCase: true }))))
    }),
    {} as _.Dictionary<string[]>
  )

  const { __avg__: avg_tfidf } = tfidf(tfidfInput)
  const copy = { ...input, tfIdf: avg_tfidf }
  copy.intents.forEach((x) => x.utterances.forEach((u) => u.setGlobalTfidf(avg_tfidf)))

  return copy
}

async function clusterTokens(input: TfIdfTrainStep, tools: Tools): Promise<ClusterTrainStep> {
  const kmeans = computeKmeans(input.intents, tools)
  const copy = { ...input, kmeans }
  copy.intents.forEach((x) => x.utterances.forEach((u) => u.setKmeans(kmeans)))
  return copy
}

/**
 * #########################
 * ### Step 2 : Entities ###
 * #########################
 */

async function extractEntities(input: ClusterTrainStep, tools: Tools, progress: progressCB): Promise<SerialTrainOuput> {
  const utterances: Utterance[] = _.chain(input.intents).flatMap('utterances').value()

  tools.logger?.debug('Extracting system entities')

  const clampedProgress = (p: number) => progress(Math.min(0.99, p))

  let step = 0
  // we extract sys entities for all utterances, helps on training and exact matcher
  const allSysEntities = await tools.systemEntityExtractor.extractMultiple(
    utterances.map((u) => u.toString()),
    input.languageCode,
    (p: number) => clampedProgress((step + p) / 3),
    true
  )

  tools.logger?.debug('Extracting list entities')

  step = 1
  const customEntityExtractor = process.env.TS_NODE_DEV
    ? new CustomEntityExtractor() // worker_threads does not work with ts-node
    : new MultiThreadCustomEntityExtractor(tools.logger)

  const allListEntities = await customEntityExtractor.extractMultipleListEntities(
    utterances,
    input.list_entities,
    (p: number) => clampedProgress((step + p) / 3)
  )

  tools.logger?.debug('Extracting pattern entities')

  step = 2
  const allPatternEntities = await customEntityExtractor.extractMultiplePatternEntities(
    utterances,
    input.pattern_entities,
    (p: number) => clampedProgress((step + p) / 3)
  )

  progress(1)

  _.zipWith(utterances, allSysEntities, allListEntities, allPatternEntities, (utt, sys, list, pattern) => ({
    utt,
    sys,
    list,
    pattern
  }))
    .map(({ utt, sys, list, pattern }) => {
      return [utt, [...sys, ...list, ...pattern]] as [Utterance, EntityExtractionResult[]]
    })
    .forEach(([utt, entities]) => {
      entities.forEach((ent) => {
        const entity: EntityExtractionResult = _.omit(ent, ['start, end']) as EntityExtractionResult
        utt.tagEntity(entity, ent.start, ent.end)
      })
    })

  return input
}

/**
 * ############################
 * ### Steps 3-5 : Parallel ###
 * ############################
 */
async function trainContextClassifier(
  input: SerialTrainOuput,
  tools: Tools,
  progress: progressCB
): Promise<ModelOf<SvmIntentClassifier>> {
  const { languageCode, intents, contexts, list_entities, pattern_entities, nluSeed } = input

  const clampedProgress = (p: number) => progress(Math.min(0.99, p))

  const rootIntents = contexts.map((ctx) => {
    const utterances = _(intents)
      .filter((intent) => intent.contexts.includes(ctx))
      .flatMap((intent) => intent.utterances)
      .value()

    return <Intent<Utterance>>{
      name: ctx,
      contexts: [],
      slot_definitions: [],
      utterances
    }
  })

  const rootIntentClassifier = new SvmIntentClassifier(tools, getCtxFeatures, tools.logger)
  const model = await rootIntentClassifier.train(
    {
      intents: rootIntents,
      languageCode,
      list_entities,
      pattern_entities,
      nluSeed
    },
    (p) => {
      clampedProgress(p)
    }
  )

  progress(1)
  return model
}

async function trainIntentClassifiers(
  input: SerialTrainOuput,
  tools: Tools,
  progress: progressCB
): Promise<_.Dictionary<ModelOf<OOSIntentClassifier>>> {
  const { list_entities, pattern_entities, intents, contexts, nluSeed, languageCode } = input

  const progressPerCtx: _.Dictionary<number> = {}

  const clampedProgress = (p: number) => progress(Math.min(0.99, p))
  const reportProgress = () => {
    const n = contexts.length
    const total = _(progressPerCtx).values().sum()
    clampedProgress(total / n)
  }

  const models = await Bluebird.map(contexts, async (ctx) => {
    const taskName = `train Clf for Ctx "${ctx}"`
    tools.logger.debug(taskStarted(input.trainId, taskName))

    const allUtterances = _.flatMap(intents, (i) => i.utterances)
    const trainableIntents = intents.filter((i) => i.contexts.includes(ctx))

    const intentClf = new OOSIntentClassifier(tools, tools.logger)
    const model = await intentClf.train(
      {
        languageCode,
        intents: trainableIntents,
        list_entities,
        nluSeed,
        pattern_entities,
        allUtterances
      },
      (p) => {
        progressPerCtx[ctx] = p
        reportProgress()
      }
    )

    tools.logger.debug(taskDone(input.trainId, taskName))
    return { ctx, model }
  })

  progress(1)

  return _(models)
    .map(({ ctx, model }) => [ctx, model])
    .fromPairs()
    .value()
}

async function trainSlotTaggers(
  input: SerialTrainOuput,
  tools: Tools,
  progress: progressCB
): Promise<_.Dictionary<ModelOf<SlotTagger>>> {
  const slotModelByIntent: _.Dictionary<ModelOf<SlotTagger>> = {}

  const clampedProgress = (p: number) => progress(Math.min(0.99, p))

  for (let i = 0; i < input.intents.length; i++) {
    const intent = input.intents[i]

    const slotTagger = new SlotTagger(tools, tools.logger)

    const model = await slotTagger.train(
      {
        intent,
        list_entites: input.list_entities
      },
      (p) => {
        const completion = (i + p) / input.intents.length
        clampedProgress(completion)
      }
    )

    slotModelByIntent[intent.name] = model
  }

  progress(1)
  return slotModelByIntent
}

const NB_STEPS = 5 // change this if the training pipeline changes

type AsyncFunction<A extends any[], R extends Promise<any>> = (...args: A) => R
const taskStarted = (id: string, taskName: string) => `[${id}] Started ${taskName}`
const taskDone = (id: string, taskName: string) => `[${id}] Done ${taskName}`

const makeLogDecorator = (trainId: string, logger: Logger) => {
  return <A extends any[], R extends Promise<any>>(fn: AsyncFunction<A, R>) => (...args: A): R => {
    logger.debug(taskStarted(trainId, fn.name))
    const ret = fn(...args)

    // awaiting if not responsibility of this logger decorator
    void ret.then(() => logger.debug(taskDone(trainId, fn.name))).catch((_err) => {})
    return ret
  }
}

export const trainingPipeline = async (
  input: TrainInput,
  tools: Tools,
  progress: (x: number) => void
): Promise<TrainOutput> => {
  tools.logger.debug(`[${input.trainId}] Started running training pipeline.`)

  let totalProgress = 0
  let normalizedProgress = 0

  const progressWatchDog = watchDog(async () => {
    const rounded = _.round(normalizedProgress, 2)
    progress(rounded)
  }, input.minProgressHeartbeat)

  const reportProgress: progressCB = (stepProgress = 1) => {
    totalProgress = Math.max(totalProgress, Math.floor(totalProgress) + stepProgress)
    const scaledProgress = Math.min(1, totalProgress / NB_STEPS)
    if (scaledProgress === normalizedProgress) {
      return
    }
    normalizedProgress = scaledProgress
    progressWatchDog.run()
  }
  const log = makeLogDecorator(input.trainId, tools.logger)

  progress(0) // 0%

  const preprocessStep = await log(preprocessInput)(input, tools)
  const tfIdfStep = await log(tfidfTokens)(preprocessStep)
  const clusterStep = await log(clusterTokens)(tfIdfStep, tools)

  reportProgress(1) // 20%

  const serialOutput = await log(extractEntities)(clusterStep, tools, reportProgress)

  const models = await Promise.all([
    log(trainContextClassifier)(serialOutput, tools, reportProgress),
    log(trainIntentClassifiers)(serialOutput, tools, reportProgress),
    log(trainSlotTaggers)(serialOutput, tools, reportProgress)
  ])
  progressWatchDog.stop()

  const [ctx_model, intent_model_by_ctx, slots_model_by_intent] = models

  const coldEntities: ColdListEntityModel[] = serialOutput.list_entities.map((e) => ({
    ...e,
    cache: e.cache.dump()
  }))

  const output: TrainOutput = {
    list_entities: coldEntities,
    tfidf: serialOutput.tfIdf,
    ctx_model,
    intent_model_by_ctx,
    slots_model_by_intent,
    contexts: input.contexts,
    vocab: Object.keys(serialOutput.vocabVectors),
    kmeans: serialOutput.kmeans && serializeKmeans(serialOutput.kmeans)
  }

  tools.logger.debug(`[${input.trainId}] Done running training pipeline.`)
  return output
}
