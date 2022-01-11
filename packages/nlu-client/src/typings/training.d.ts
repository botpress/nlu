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
