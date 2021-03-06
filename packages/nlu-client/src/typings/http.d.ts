/**
 * ############
 * ### HTTP ###
 * ############
 */

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

export interface TrainRequestBody {
  language: string
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed?: number
}

export interface PredictRequestBody {
  utterances: string[]
}

export interface DetectLangRequestBody extends PredictRequestBody {
  models: string[]
}

export interface ErrorResponse {
  success: false
  error: string
}

export interface SuccessReponse {
  success: true
}

export interface InfoResponseBody extends SuccessReponse {
  info: ServerInfo
}

export interface TrainResponseBody extends SuccessReponse {
  modelId: string
}

export interface TrainProgressResponseBody extends SuccessReponse {
  session: TrainingState
}

export interface ListTrainingsResponseBody extends SuccessReponse {
  trainings: Training[]
}

export interface ListModelsResponseBody extends SuccessReponse {
  models: string[]
}

export interface PruneModelsResponseBody extends SuccessReponse {
  models: string[]
}

export interface PredictResponseBody extends SuccessReponse {
  predictions: PredictOutput[]
}

export interface DetectLangResponseBody extends SuccessReponse {
  detectedLanguages: string[]
}
