import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelOf } from 'src/component'
import { Model, SlotDefinition } from '../typings'
import { OOSIntentClassifier } from './intents/oos-intent-classfier'
import { SvmIntentClassifier } from './intents/svm-intent-classifier'
import { SlotTagger } from './slots/slot-tagger'
import { ListEntityModel, Intent, PatternEntity, SerializedKmeansResult, TFIDF } from './typings'

export type PredictableModelData = {
  intents: Intent<string>[]
  languageCode: string
  pattern_entities: PatternEntity[]
  contexts: string[]
  list_entities: ListEntityModel[]
  tfidf: TFIDF
  vocab: string[]
  kmeans: SerializedKmeansResult | undefined
  ctx_model: ModelOf<SvmIntentClassifier>
  intent_model_by_ctx: _.Dictionary<ModelOf<OOSIntentClassifier>>
  slots_model_by_intent: _.Dictionary<ModelOf<SlotTagger>>
}

export type PredictableModel = Omit<Model, 'data'> & {
  data: PredictableModelData
}

const PTBSlotDef = new ptb.PTBMessage('SlotDef', {
  name: { type: 'string', id: 1, rule: 'required' },
  entities: { type: 'string', id: 2, rule: 'repeated' }
})

const PTBIntentDef = new ptb.PTBMessage('IntentDef', {
  name: { type: 'string', id: 1, rule: 'required' },
  contexts: { type: 'string', id: 2, rule: 'repeated' },
  slot_definitions: { type: PTBSlotDef, id: 3, rule: 'repeated' },
  utterances: { type: 'string', id: 4, rule: 'repeated' }
})

const PTBPatternEntityDef = new ptb.PTBMessage('PatternEntityDef', {
  name: { type: 'string', id: 1, rule: 'required' },
  pattern: { type: 'string', id: 2, rule: 'required' },
  examples: { type: 'string', id: 3, rule: 'repeated' },
  matchCase: { type: 'bool', id: 4, rule: 'required' },
  sensitive: { type: 'bool', id: 5, rule: 'required' }
})

const PTBSynonymValue = new ptb.PTBMessage('ListEntitySynonymValue', {
  tokens: { type: 'string', id: 1, rule: 'repeated' }
})

const PTBSynonym = new ptb.PTBMessage('ListEntitySynonym', {
  values: { type: PTBSynonymValue, id: 1, rule: 'repeated' }
})

const PTBListEntityModel = new ptb.PTBMessage('ListEntityModel', {
  type: { type: 'string', id: 1, rule: 'required' },
  id: { type: 'string', id: 2, rule: 'required' },
  entityName: { type: 'string', id: 3, rule: 'required' },
  fuzzyTolerance: { type: 'double', id: 4, rule: 'required' },
  sensitive: { type: 'bool', id: 5, rule: 'required' },
  mappingsTokens: { keyType: 'string', type: PTBSynonym, id: 6 }
})

const PTBCentroid = new ptb.PTBMessage('KmeanCentroid', {
  centroid: { type: 'double', id: 1, rule: 'repeated' },
  error: { type: 'double', id: 2, rule: 'required' },
  size: { type: 'int32', id: 3, rule: 'required' }
})

const PTBKmeansResult = new ptb.PTBMessage('KmeansResult', {
  clusters: { type: 'int32', id: 1, rule: 'repeated' },
  centroids: { type: PTBCentroid, id: 2, rule: 'repeated' },
  iterations: { type: 'int32', id: 3, rule: 'required' }
})

let model_data_idx = 0
const PTBPredictableModelData = new ptb.PTBMessage('PredictableModelData', {
  intents: { type: PTBIntentDef, id: model_data_idx++, rule: 'repeated' },
  languageCode: { type: 'string', id: model_data_idx++, rule: 'required' },
  pattern_entities: { type: PTBPatternEntityDef, id: model_data_idx++, rule: 'repeated' },
  contexts: { type: 'string', id: model_data_idx++, rule: 'repeated' },
  list_entities: { type: PTBListEntityModel, id: model_data_idx++, rule: 'repeated' },
  tfidf: { keyType: 'string', type: 'double', id: model_data_idx++ },
  vocab: { type: 'string', id: model_data_idx++, rule: 'repeated' },
  kmeans: { type: PTBKmeansResult, id: model_data_idx++, rule: 'optional' },
  ctx_model: { type: SvmIntentClassifier.modelType, id: model_data_idx++, rule: 'required' },
  intent_model_by_ctx: { keyType: 'string', type: OOSIntentClassifier.modelType, id: model_data_idx++ },
  slots_model_by_intent: { keyType: 'string', type: SlotTagger.modelType, id: model_data_idx++ }
})

const encodeListEntity = (list_entity: ListEntityModel): ptb.Infer<typeof PTBListEntityModel> => {
  const { mappingsTokens: encodedMappingTokens, ...others } = list_entity
  const decodedMappingTokens = _.mapValues(encodedMappingTokens, (syn) => ({
    values: syn.map((synValue) => ({ tokens: synValue }))
  }))
  return {
    ...others,
    mappingsTokens: decodedMappingTokens
  }
}

const decodeListEntity = (list_entity: ptb.Infer<typeof PTBListEntityModel>): ListEntityModel => {
  const { mappingsTokens: decodedMappingTokens, ...others } = list_entity
  const encodedMappingTokens = _.mapValues(decodedMappingTokens, ({ values }) =>
    values ? values.map(({ tokens }) => tokens ?? []) : []
  )
  return {
    ...others,
    type: 'custom.list',
    mappingsTokens: encodedMappingTokens
  }
}

const decodeSlot = (slot: ptb.Infer<typeof PTBSlotDef>): SlotDefinition => {
  const { name, entities } = slot
  return {
    name,
    entities: entities ?? []
  }
}

const decodeIntent = (intent: ptb.Infer<typeof PTBIntentDef>): Intent<string> => {
  const { name, slot_definitions, contexts, utterances } = intent
  return {
    name,
    slot_definitions: slot_definitions ? slot_definitions.map(decodeSlot) : [],
    contexts: contexts ?? [],
    utterances: utterances ?? []
  }
}

const decodePattern = (pattern: ptb.Infer<typeof PTBPatternEntityDef>): PatternEntity => {
  const { examples, ...others } = pattern
  return {
    ...others,
    examples: examples ?? []
  }
}

const decodeKmeans = (kmeans: ptb.Infer<typeof PTBKmeansResult>): SerializedKmeansResult => {
  const { iterations, centroids, clusters } = kmeans
  return {
    iterations,
    clusters: clusters ?? [],
    centroids: centroids
      ? centroids.map(({ centroid, error, size }) => ({ centroid: centroid ?? [], error, size }))
      : []
  }
}

export const serializeModel = (model: PredictableModel): Model => {
  const { id, startedAt, finishedAt, data: predictableData } = model

  const { list_entities, ...others } = predictableData

  const serializedData = Buffer.from(
    PTBPredictableModelData.encode({ ...others, list_entities: list_entities.map(encodeListEntity) })
  )

  const serialized: Model = {
    id,
    startedAt,
    finishedAt,
    data: serializedData
  }
  return serialized
}

export const deserializeModel = (serialized: Model): PredictableModel => {
  const { id, startedAt, finishedAt, data: serializedData } = serialized

  const {
    list_entities,
    intents,
    languageCode,
    pattern_entities,
    contexts,
    tfidf,
    vocab,
    kmeans,
    ctx_model,
    intent_model_by_ctx,
    slots_model_by_intent
  } = PTBPredictableModelData.decode(serializedData)

  const model: PredictableModel = {
    id,
    startedAt,
    finishedAt,
    data: {
      list_entities: list_entities ? list_entities.map(decodeListEntity) : [],
      intents: intents ? intents.map(decodeIntent) : [],
      languageCode,
      pattern_entities: pattern_entities ? pattern_entities.map(decodePattern) : [],
      contexts: contexts ?? [],
      tfidf,
      vocab: vocab ?? [],
      kmeans: kmeans && decodeKmeans(kmeans),
      ctx_model,
      intent_model_by_ctx,
      slots_model_by_intent
    }
  }
  return model
}
