import {
  TrainRequestBody,
  PredictRequestBody,
  DetectLangRequestBody,
  ErrorResponse,
  SuccessReponse,
  InfoResponseBody,
  TrainResponseBody,
  TrainProgressResponseBody,
  ListModelsResponseBody,
  PruneModelsResponseBody,
  PredictResponseBody,
  DetectLangResponseBody,
  ListTrainingsResponseBody
} from './http'
import { AxiosRequestConfig, AxiosInstance } from 'axios'

export class Client {
  readonly axios: AxiosInstance

  constructor(config: AxiosRequestConfig)

  getInfo(): Promise<InfoResponseBody | ErrorResponse>
  startTraining(appId: string, trainRequestBody: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse>
  listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse>
  getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse>
  cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse>
  listModels(appId: string): Promise<ListModelsResponseBody | ErrorResponse>
  pruneModels(appId: string): Promise<PruneModelsResponseBody | ErrorResponse>
  detectLanguage(
    appId: string,
    detectLangRequestBody: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse>
  predict(
    appId: string,
    modelId: string,
    predictRequestBody: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse>
}

export * as http from './http'
export * from './sdk'
