export const SYSTEM_ENTITIES: string[]

export const errors: {
  isTrainingAlreadyStarted: (err: Error) => boolean
  isTrainingCanceled: (err: Error) => boolean
}

export const makeEngine: (config: Config, logger: Logger) => Promise<Engine>

export const modelIdService: ModelIdService

export class LanguageService {
  constructor(dim: number, domain: string, langDir: string, logger?: Logger)
  isReady: boolean
  dim: number
  domain: string
  initialize(): Promise<void>
  loadModel(lang: string): Promise<void>
  tokenize(utterances: string[], lang: string): Promise<string[][]>
  vectorize(tokens: string[], lang: string): Promise<number[][]>
  getModels()
  remove(lang: string)
}

export interface Config extends LanguageConfig {
  modelCacheSize: string
  legacyElection: boolean
}

export interface LanguageConfig {
  ducklingURL: string
  ducklingEnabled: boolean
  languageSources: LanguageSource[]
  cachePath: string
}

export interface LanguageSource {
  endpoint: string
  authToken?: string
}

export interface Logger {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
  sub: (namespace: string) => Logger
}

export interface ModelIdArgs extends TrainInput {
  specifications: Specifications
}

export interface TrainingOptions {
  progressCallback: (x: number) => void
  previousModel: ModelId | undefined
  minProgressHeartbeat: number
}

export interface Engine {
  getHealth: () => Health
  getLanguages: () => string[]
  getSpecifications: () => Specifications

  loadModel: (model: Model) => Promise<void>
  unloadModel: (modelId: ModelId) => void
  hasModel: (modelId: ModelId) => boolean

  train: (trainSessionId: string, trainSet: TrainInput, options?: Partial<TrainingOptions>) => Promise<Model>
  cancelTraining: (trainSessionId: string) => Promise<void>

  detectLanguage: (text: string, modelByLang: { [key: string]: ModelId }) => Promise<string>
  predict: (text: string, modelId: ModelId) => Promise<PredictOutput>
}

export interface ModelIdService {
  toString: (modelId: ModelId) => string // to use ModelId as a key
  areSame: (id1: ModelId, id2: ModelId) => boolean
  fromString: (stringId: string) => ModelId // to parse information from a key
  isId: (m: string) => boolean
  makeId: (factors: ModelIdArgs) => ModelId
  briefId: (factors: Partial<ModelIdArgs>) => Partial<ModelId> // makes incomplete Id from incomplete information
  halfmd5: (str: string) => string
}

export interface ModelId {
  specificationHash: string // represents the nlu engine that was used to train the model
  contentHash: string // represents the intent and entity definitions the model was trained with
  seed: number // number to seed the random number generators used during nlu training
  languageCode: string // language of the model
}

export interface Model {
  id: ModelId
  startedAt: Date
  finishedAt: Date
  data: {
    input: string
    output: string
  }
}

export interface Specifications {
  nluVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}

export interface Health {
  isEnabled: boolean
  validProvidersCount: number
  validLanguages: string[]
}

/**
 * ##################################
 * ############ TRAINING ############
 * ##################################
 */

export interface TrainInput {
  language: string
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed: number
}

export interface IntentDefinition {
  name: string
  contexts: string[]
  utterances: string[]
  slots: SlotDefinition[]
}

export interface SlotDefinition {
  name: string
  entities: string[]
}

export interface ListEntityDefinition {
  name: string
  type: 'list'
  values: { name: string; synonyms: string[] }[]
  fuzzy: number

  sensitive?: boolean
}

export interface PatternEntityDefinition {
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

export type TrainingErrorType = 'already-started' | 'unknown'

export interface TrainingError {
  type: TrainingErrorType
  message: string
  stackTrace?: string
}

export interface TrainingProgress {
  status: TrainingStatus
  progress: number
  error?: TrainingError
}

/**
 * ####################################
 * ############ PREDICTION ############
 * ####################################
 */
export interface PredictOutput {
  entities: EntityPrediction[]
  contexts: ContextPrediction[]
  spellChecked: string
}

export type EntityType = 'pattern' | 'list' | 'system'

export interface EntityPrediction {
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

export interface ContextPrediction {
  name: string
  oos: number
  confidence: number
  intents: IntentPrediction[]
}

export interface IntentPrediction {
  name: string
  confidence: number
  slots: SlotPrediction[]
  extractor: string
}

export interface SlotPrediction {
  name: string
  value: string
  confidence: number
  source: string
  start: number
  end: number
  entity: EntityPrediction | null
}
