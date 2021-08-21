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
  ErrorResponse
} from './typings/http'

export class NLUClient implements IClient {
  protected _client: AxiosInstance

  constructor(protected _endpoint: string, protected _appId: string, protected _authToken?: string) {
    this._client = axios.create({
      baseURL: this._endpoint,
      headers: { Authorization: `Bearer ${this._authToken}`, 'X-App-Id': _appId }
    })
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const { data } = await this._client.get('info')
      return data
    })
  }

  public async startTraining(trainRequestBody: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const { data } = await this._client.post('train', trainRequestBody)
      return data
    })
  }

  public async getTrainingStatus(modelId: string): Promise<TrainProgressResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = `train/${modelId}`
      const { data } = await this._client.get(endpoint)
      return data
    })
  }

  public async cancelTraining(modelId: string): Promise<SuccessReponse | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = `train/${modelId}/cancel`
      const { data } = await this._client.post(endpoint)
      return data
    })
  }

  public async listModels(): Promise<ListModelsResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = 'models/'
      const { data } = await this._client.get(endpoint)
      return data
    })
  }

  public async pruneModels(): Promise<PruneModelsResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = 'models/prune'
      const { data } = await this._client.post(endpoint)
      return data
    })
  }

  public async detectLanguage(
    detectLangRequestBody: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = 'detect-lang'
      const { data } = await this._client.post(endpoint, detectLangRequestBody)
      return data
    })
  }

  public async predict(
    modelId: string,
    predictRequestBody: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse> {
    return this._wrapWithTryCatch(async () => {
      const endpoint = `predict/${modelId}`
      const { data } = await this._client.post(endpoint, predictRequestBody)
      return data
    })
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
