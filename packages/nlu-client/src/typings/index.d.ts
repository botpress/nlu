import { AxiosRequestConfig, AxiosInstance } from 'axios'
import { IssueComputationSpeed } from './linting'
import {
  TrainRequestBody,
  LintRequestBody,
  PredictRequestBody,
  DetectLangRequestBody,
  ErrorResponse,
  SuccessReponse,
  InfoResponseBody,
  TrainResponseBody,
  LintResponseBody,
  TrainProgressResponseBody,
  ListModelsResponseBody,
  PruneModelsResponseBody,
  PredictResponseBody,
  DetectLangResponseBody,
  ListTrainingsResponseBody,
  LintProgressResponseBody
} from './http'

export class Client {
  readonly axios: AxiosInstance

  constructor(config: AxiosRequestConfig)

  getInfo(): Promise<InfoResponseBody | ErrorResponse>

  startTraining(appId: string, trainRequestBody: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse>
  getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse>
  listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse>
  cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse>

  /**
   * @experimental still subject to breaking changes
   */
  startLinting(appId: string, lintRequestBody: LintRequestBody): Promise<LintResponseBody | ErrorResponse>
  /**
   * @experimental still subject to breaking changes
   */
  getLintingStatus(
    appId: string,
    modelId: string,
    speed: IssueComputationSpeed
  ): Promise<LintProgressResponseBody | ErrorResponse>
  /**
   * @experimental still subject to breaking changes
   */
  cancelLinting(appId: string, modelId: string, speed: IssueComputationSpeed): Promise<SuccessReponse | ErrorResponse>

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
export * from './training'
export * from './prediction'
export * from './linting'
export * from './info'
