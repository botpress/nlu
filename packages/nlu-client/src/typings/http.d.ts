/**
 * ############
 * ### HTTP ###
 * ############
 */

import { DatasetIssue, IssueCode, LintingState } from './linting'
import {
  TrainingState,
  PredictOutput,
  IntentDefinition,
  EntityDefinition,
  Specifications,
  Health,
  ServerInfo,
  Training
} from './sdk'

export type TrainRequestBody = {
  language: string
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed?: number
}

export type LintRequestBody = {
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
  | 'invalid_train_set'
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

export type SuccessReponse = {
  success: true
}

export type InfoResponseBody = {
  info: ServerInfo
} & SuccessReponse

export type TrainResponseBody = {
  modelId: string
} & SuccessReponse

export type LintResponseBody = {
  modelId: string
} & SuccessReponse

export type TrainProgressResponseBody = {
  session: TrainingState
} & SuccessReponse

export type LintProgressResponseBody = {
  session: LintingState
} & SuccessReponse

export type ListTrainingsResponseBody = {
  trainings: Training[]
} & SuccessReponse

export type ListModelsResponseBody = {
  models: string[]
} & SuccessReponse

export type PruneModelsResponseBody = {
  models: string[]
} & SuccessReponse

export type PredictResponseBody = {
  predictions: PredictOutput[]
} & SuccessReponse

export type DetectLangResponseBody = {
  detectedLanguages: string[]
} & SuccessReponse
