import _ from 'lodash'
import { Model } from '../typings'
import { ListEntityModel, Intent, PatternEntity, SerializedKmeansResult, TFIDF } from './typings'

export type PredictableModel = Omit<Model, 'data'> & {
  data: {
    // input
    intents: Intent<string>[]
    languageCode: string
    pattern_entities: PatternEntity[]
    contexts: string[]

    // output
    list_entities: ListEntityModel[]
    tfidf: TFIDF
    vocab: string[]
    kmeans: SerializedKmeansResult | undefined
    ctx_model: Buffer
    intent_model_by_ctx: _.Dictionary<Buffer>
    slots_model_by_intent: _.Dictionary<Buffer>
  }
}

export function serializeModel(model: PredictableModel): Model {
  const { id, startedAt, finishedAt, data: parsedData } = model
  const { ctx_model, intent_model_by_ctx, slots_model_by_intent, ...others } = parsedData

  const serializedData = JSON.stringify({
    ...others,
    ctx_model: Buffer.from(ctx_model).toString('hex'),
    intent_model_by_ctx: _.mapValues(intent_model_by_ctx, (m) => Buffer.from(m).toString('hex')),
    slots_model_by_intent: _.mapValues(slots_model_by_intent, (m) => Buffer.from(m).toString('hex'))
  })

  const serialized: Model = {
    id,
    startedAt,
    finishedAt,
    data: serializedData
  }
  return serialized
}

export function deserializeModel(serialized: Model): PredictableModel {
  const { id, startedAt, finishedAt, data: serializedData } = serialized
  const { ctx_model, intent_model_by_ctx, slots_model_by_intent, ...others } = JSON.parse(serializedData)

  const parsedData = {
    ...others,
    ctx_model: Buffer.from(ctx_model as string, 'hex'),
    intent_model_by_ctx: _.mapValues(intent_model_by_ctx as _.Dictionary<string>, (m) => Buffer.from(m, 'hex')),
    slots_model_by_intent: _.mapValues(slots_model_by_intent as _.Dictionary<string>, (m) => Buffer.from(m, 'hex'))
  }

  const model: PredictableModel = {
    id,
    startedAt,
    finishedAt,
    data: parsedData
  }
  return model
}
