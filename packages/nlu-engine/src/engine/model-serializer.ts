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
  const { id, startedAt, finishedAt, data } = model

  const serialized: Model = {
    id,
    startedAt,
    finishedAt,
    data: ''
  }

  serialized.data = JSON.stringify(data)

  return serialized
}

export function deserializeModel(serialized: Model): PredictableModel {
  const { id, startedAt, finishedAt, data } = serialized

  const model: PredictableModel = {
    id,
    startedAt,
    finishedAt,
    data: JSON.parse(data)
  }
  return model
}
