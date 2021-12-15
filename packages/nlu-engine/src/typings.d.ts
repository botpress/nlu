import * as hints from './hints'

export const SYSTEM_ENTITIES: string[]

export const errors: {
  isTrainingAlreadyStarted: (err: Error) => boolean
  isTrainingCanceled: (err: Error) => boolean
  isLangServerError: (err: Error) => boolean
  isDucklingServerError: (err: Error) => boolean
}

export const makeEngine: (config: Config, logger: Logger) => Promise<Engine>

export const modelIdService: ModelIdService

export type InstalledModel = {
  lang: string
  loaded: boolean
}

export class LanguageService {
  constructor(dim: number, domain: string, langDir: string, logger?: Logger)
  isReady: boolean
  dim: number
  domain: string
  public initialize(): Promise<void>
  public loadModel(lang: string): Promise<void>
  public tokenize(utterances: string[], lang: string): Promise<string[][]>
  public vectorize(tokens: string[], lang: string): Promise<number[][]>
  public getModels(): InstalledModel[]
  public remove(lang: string): void
}

export type Config = {
  modelCacheSize: string
} & LanguageConfig

export type LanguageConfig = {
  ducklingURL: string
  ducklingEnabled: boolean
  languageURL: string
  languageAuthToken?: string
  cachePath: string
}

export type Logger = {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
  sub: (namespace: string) => Logger
}

export type ModelIdArgs = {
  specifications: Specifications
} & TrainInput

export type TrainingProgress = (p: number) => void
export type TrainingOptions = {
  progressCallback: TrainingProgress
  previousModel: ModelId | undefined
  minProgressHeartbeat: number
}

export type CheckingProgress = (current: number, total: number, issues: hints.DatasetIssue<hints.IssueCode>[]) => void
export type CheckingOptions = {
  progressCallback: CheckingProgress
  minSpeed: hints.IssueComputationSpeed
}

export type Engine = {
  getLanguages: () => string[]
  getSpecifications: () => Specifications

  loadModel: (model: Model) => Promise<void>
  unloadModel: (modelId: ModelId) => void
  hasModel: (modelId: ModelId) => boolean

  train: (trainingId: string, trainSet: TrainInput, options?: Partial<TrainingOptions>) => Promise<Model>
  cancelTraining: (trainingId: string) => Promise<void>

  check: (checkingId: string, trainSet: TrainInput, options?: Partial<CheckingOptions>) => Promise<hints.DatasetReport>
  cancelChecking: (checkingId: string) => Promise<void>
  getIssueDetails: <C extends IssueCode>(code: C) => hints.IssueDefinition<C> | undefined

  detectLanguage: (text: string, modelByLang: { [key: string]: ModelId }) => Promise<string>
  predict: (text: string, modelId: ModelId) => Promise<PredictOutput>
}

export type ModelIdService = {
  toString: (modelId: ModelId) => string // to use ModelId as a key
  fromString: (stringId: string) => ModelId // to parse information from a key
  areSame: (id1: ModelId, id2: ModelId) => boolean
  isId: (m: string) => boolean
  makeId: (factors: ModelIdArgs) => ModelId
  briefId: (factors: Partial<ModelIdArgs>) => Partial<ModelId> // makes incomplete Id from incomplete information
  halfmd5: (str: string) => string
}

export type ModelId = {
  specificationHash: string // represents the nlu engine that was used to train the model
  contentHash: string // represents the intent and entity definitions the model was trained with
  seed: number // number to seed the random number generators used during nlu training
  languageCode: string // language of the model
}

export type Model = {
  id: ModelId
  startedAt: Date
  finishedAt: Date
  data: {
    input: string
    output: string
  }
}

export type LangServerSpecs = {
  dimensions: number
  domain: string
  version: string
}

export type Specifications = {
  engineVersion: string
  languageServer: LangServerSpecs
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

export type TrainingErrorType = 'already-started' | 'internal'

export type TrainingError = {
  type: TrainingErrorType
  message: string
  stackTrace?: string
}

export type TrainingProgress = {
  status: TrainingStatus
  progress: number
  error?: TrainingError
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
