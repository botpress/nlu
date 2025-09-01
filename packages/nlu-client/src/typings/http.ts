/**
 * ############
 * ### HTTP ###
 * ############
 */

import { ServerInfo } from './info'
import { LintingState, IssueComputationSpeed } from './linting'
import { PredictOutput } from './prediction'
import { TrainingState, IntentDefinition, EntityDefinition, Training } from './training'

export type TrainRequestBody = {
  language: string
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed?: number
}

export type LintRequestBody = {
  speed: IssueComputationSpeed
  language: string
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
}

export type PredictRequestBody = {
  utterances: string[]
}

export type DetectLangRequestBody = {
  models: string[]
} & PredictRequestBody

export type ErrorType =
  | 'model_not_found'
  | 'training_not_found'
  | 'linting_not_found'
  | 'training_already_started'
  | 'request_format'
  | 'lang-server'
  | 'duckling-server'
  | 'internal'
  | 'dataset_format'

export type NLUError = {
  message: string
  stack?: string
  type: ErrorType
  code: number
}

export type ErrorResponse = {
  success: false
  error: NLUError
}

export type SuccessResponse = {
  success: true
}

export type InfoResponseBody = {
  info: ServerInfo
} & SuccessResponse

export type TrainResponseBody = {
  modelId: string
} & SuccessResponse

export type LintResponseBody = {
  modelId: string
} & SuccessResponse

export type TrainProgressResponseBody = {
  session: TrainingState
} & SuccessResponse

export type LintProgressResponseBody = {
  session: LintingState
} & SuccessResponse

export type ListTrainingsResponseBody = {
  trainings: Training[]
} & SuccessResponse

export type ListModelsResponseBody = {
  models: string[]
} & SuccessResponse

export type PruneModelsResponseBody = {
  models: string[]
} & SuccessResponse

export type PredictResponseBody = {
  predictions: PredictOutput[]
} & SuccessResponse

export type DetectLangResponseBody = {
  detectedLanguages: string[]
} & SuccessResponse
