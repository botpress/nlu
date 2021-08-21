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
  DetectLangResponseBody
} from './http'

export class Client {
  constructor(endpoint: string, appId: string, authToken?: string)
  getInfo(): Promise<InfoResponseBody | ErrorResponse>
  startTraining(trainRequestBody: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse>
  getTrainingStatus(modelId: string): Promise<TrainProgressResponseBody | ErrorResponse>
  cancelTraining(modelId: string): Promise<SuccessReponse | ErrorResponse>
  listModels(): Promise<ListModelsResponseBody | ErrorResponse>
  pruneModels(): Promise<PruneModelsResponseBody | ErrorResponse>
  detectLanguage(detectLangRequestBody: DetectLangRequestBody): Promise<DetectLangResponseBody | ErrorResponse>
  predict(modelId: string, predictRequestBody: PredictRequestBody): Promise<PredictResponseBody | ErrorResponse>
}

export * as http from './http'
export * from './sdk'
