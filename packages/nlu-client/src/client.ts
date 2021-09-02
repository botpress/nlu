import axios, { AxiosInstance } from 'axios'

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

export class NLUClient implements IClient {
  protected _client: AxiosInstance

  constructor(protected _endpoint: string) {
    this._client = axios.create({ baseURL: this._endpoint })
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const { data } = await this._client.get('info')
      return data
    })
  }

  public async startTraining(
    appId: string,
    trainRequestBody: TrainRequestBody
  ): Promise<TrainResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const { data } = await this._client.post('train', trainRequestBody, { headers })
      return data
    })
  }

  public async listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = 'train'
      const params = lang && { lang }
      const { data } = await this._client.get(endpoint, { headers, params })
      return data
    })
  }

  public async getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = `train/${modelId}`
      const { data } = await this._client.get(endpoint, { headers })
      return data
    })
  }

  public async cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = `train/${modelId}/cancel`
      const { data } = await this._client.post(endpoint, {}, { headers })
      return data
    })
  }

  public async listModels(appId: string): Promise<ListModelsResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = 'models'
      const { data } = await this._client.get(endpoint, { headers })
      return data
    })
  }

  public async pruneModels(appId: string): Promise<PruneModelsResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = 'models/prune'
      const { data } = await this._client.post(endpoint, {}, { headers })
      return data
    })
  }

  public async detectLanguage(
    appId: string,
    detectLangRequestBody: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = 'detect-lang'
      const { data } = await this._client.post(endpoint, detectLangRequestBody, { headers })
      return data
    })
  }

  public async predict(
    appId: string,
    modelId: string,
    predictRequestBody: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const headers = this._appIdHeader(appId)
      const endpoint = `predict/${modelId}`
      const { data } = await this._client.post(endpoint, predictRequestBody, { headers })
      return data
    })
  }

  private _appIdHeader = (appId: string) => {
    return {
      'X-App-Id': appId
    }
  }

  private async _wrapWithTryCatch<T>(fn: () => Promise<T>) {
    try {
      const ret = await fn()
      return ret
    } catch (err) {
      const { response } = err ?? {}
      if (_.isBoolean(response?.data?.success)) {
        return response.data // in this case the response body contains details about error
      }
      throw err // actual http error
    }
  }
}
