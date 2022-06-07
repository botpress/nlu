import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import _ from 'lodash'
import { Client as IClient } from './typings'
import {
  TrainResponseBody,
  TrainRequestBody,
  InfoResponseBody,
  TrainProgressResponseBody,
  SuccessReponse,
  DetectLangRequestBody,
  DetectLangResponseBody,
  ListModelsResponseBody,
  PruneModelsResponseBody,
  PredictRequestBody,
  PredictResponseBody,
  ErrorResponse,
  ListTrainingsResponseBody
} from './typings/http'
import { validateResponse } from './validation'

const DEFAULT_CONFIG: AxiosRequestConfig = {
  validateStatus: () => true
}

export class NLUClient implements IClient {
  protected _axios: AxiosInstance

  constructor(config: AxiosRequestConfig) {
    this._axios = axios.create({ ...DEFAULT_CONFIG, ...config })
  }

  public get axios() {
    return this._axios
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    const { data } = await this._axios.get('info')
    return validateResponse<InfoResponseBody>(data)
  }

  public async startTraining(
    appId: string,
    trainRequestBody: TrainRequestBody
  ): Promise<TrainResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const { data } = await this._axios.post('train', trainRequestBody, { headers })
    return validateResponse<TrainResponseBody>(data)
  }

  public async listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = 'train'
    const params = lang && { lang }
    const { data } = await this._axios.get(endpoint, { headers, params })
    return validateResponse<ListTrainingsResponseBody>(data)
  }

  public async getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = `train/${modelId}`
    const { data } = await this._axios.get(endpoint, { headers })
    return validateResponse<TrainProgressResponseBody>(data)
  }

  public async cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = `train/${modelId}/cancel`
    const { data } = await this._axios.post(endpoint, {}, { headers })
    return validateResponse<SuccessReponse>(data)
  }

  public async listModels(appId: string): Promise<ListModelsResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = 'models'
    const { data } = await this._axios.get(endpoint, { headers })
    return validateResponse<ListModelsResponseBody>(data)
  }

  public async pruneModels(appId: string): Promise<PruneModelsResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = 'models/prune'
    const { data } = await this._axios.post(endpoint, {}, { headers })
    return validateResponse<PruneModelsResponseBody>(data)
  }

  public async detectLanguage(
    appId: string,
    detectLangRequestBody: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = 'detect-lang'
    const { data } = await this._axios.post(endpoint, detectLangRequestBody, { headers })
    return validateResponse<DetectLangResponseBody>(data)
  }

  public async predict(
    appId: string,
    modelId: string,
    predictRequestBody: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse> {
    const headers = this._appIdHeader(appId)
    const endpoint = `predict/${modelId}`
    const { data } = await this._axios.post(endpoint, predictRequestBody, { headers })
    return validateResponse<PredictResponseBody>(data)
  }

  private _appIdHeader = (appId: string) => {
    return {
      'X-App-Id': appId
    }
  }
}
