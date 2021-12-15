export type ServerInfo = {
  specs: Specifications
  languages: string[]
  version: string
}

export type Specifications = {
  engineVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}

/**
 * ##################################
 * ############ TRAINING ############
 * ##################################
 */

export type TrainInput = {
  language: string
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed: number
}

export type IntentDefinition = {
  name: string
  contexts: string[]
  utterances: string[]
  slots: SlotDefinition[]
}

export type SlotDefinition = {
  name: string
  entities: string[]
}

export type ListEntityDefinition = {
  name: string
  type: 'list'
  values: { name: string; synonyms: string[] }[]
  fuzzy: number

  sensitive?: boolean
}

export type PatternEntityDefinition = {
  name: string
  type: 'pattern'
  regex: string
  case_sensitive: boolean
  examples: string[]

  sensitive?: boolean
}

export type EntityDefinition = ListEntityDefinition | PatternEntityDefinition

/**
 * done : when a training is complete
 * training-pending : when a training was launched, but the training process is not started yet
 * training: when a chatbot is currently training
 * canceled: when a training was canceled
 * errored: when an unhandled error occured during training
 */
export type TrainingStatus = 'done' | 'training-pending' | 'training' | 'canceled' | 'errored'

export type TrainingErrorType = 'lang-server' | 'duckling-server' | 'zombie-training' | 'internal'

export type TrainingError = {
  type: TrainingErrorType
  message: string
  stack?: string
}

export type TrainingState = {
  status: TrainingStatus
  progress: number
  error?: TrainingError
}

export type Training = TrainingState & {
  modelId: string
}

/**
 * ####################################
 * ############ PREDICTION ############
 * ####################################
 */
export type PredictOutput = {
  entities: EntityPrediction[]
  contexts: ContextPrediction[]
  spellChecked: string
}

export type EntityType = 'pattern' | 'list' | 'system'

export type EntityPrediction = {
  name: string
  type: string // ex: ['custom.list.fruits', 'system.time']
  value: string
  confidence: number
  source: string
  start: number
  end: number
  unit?: string

  sensitive?: boolean
}

export type ContextPrediction = {
  name: string
  oos: number
  confidence: number
  intents: IntentPrediction[]
}

export type IntentPrediction = {
  name: string
  confidence: number
  slots: SlotPrediction[]
  extractor: string
}

export type SlotPrediction = {
  name: string
  value: string
  confidence: number
  source: string
  start: number
  end: number
  entity: EntityPrediction | null
}
