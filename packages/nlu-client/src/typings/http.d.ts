/**
 * ############
 * ### HTTP ###
 * ############
 */

import { TrainingState, PredictOutput, IntentDefinition, EntityDefinition, Specifications, Health } from './sdk'

export interface Credentials {
  appId: string
  appSecret: string
}

export interface TrainRequestBody extends Credentials {
  language: string
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  seed?: number
}

export interface PredictRequestBody extends Credentials {
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
