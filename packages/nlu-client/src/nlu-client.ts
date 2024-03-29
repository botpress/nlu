import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import _ from 'lodash'
import { appIdHeader } from './app-id'
import { ClientResponseError } from './error'
import { HTTPCall, HTTPVerb } from './http-call'
import { ModelTransferClient } from './model-client'
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
  ListTrainingsResponseBody,
  LintRequestBody,
  LintResponseBody,
  LintProgressResponseBody
} from './typings/http'
import { IssueComputationSpeed } from './typings/linting'
import { validateResponse } from './validation'

export class NLUClient {
  protected _axios: AxiosInstance
  public readonly modelWeights: ModelTransferClient

  constructor(config: AxiosRequestConfig & { baseURL: string }) {
    config = { ...config, validateStatus: () => true }
    this._axios = axios.create(config)
    this.modelWeights = new ModelTransferClient(config)
  }

  public get axios() {
    return this._axios
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    const ressource = 'info'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call)
    return validateResponse<InfoResponseBody>(call, res)
  }

  public async startTraining(appId: string, body: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'train'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateResponse<TrainResponseBody>(call, res)
  }

  /**
   * @experimental still subject to breaking changes
   */
  public async startLinting(appId: string, body: LintRequestBody): Promise<LintResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'lint'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateResponse<LintResponseBody>(call, res)
  }

  public async listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'train'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const params = lang && { lang }
    const res = await this._get(call, { headers, params })
    return validateResponse<ListTrainingsResponseBody>(call, res)
  }

  public async getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = `train/${modelId}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateResponse<TrainProgressResponseBody>(call, res)
  }

  /**
   * @experimental still subject to breaking changes
   */
  public async getLintingStatus(
    appId: string,
    modelId: string,
    speed: IssueComputationSpeed
  ): Promise<LintProgressResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = `lint/${modelId}/${speed}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateResponse<LintProgressResponseBody>(call, res)
  }

  public async cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = `train/${modelId}/cancel`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateResponse<SuccessReponse>(call, res)
  }

  /**
   * @experimental still subject to breaking changes
   */
  public async cancelLinting(
    appId: string,
    modelId: string,
    speed: IssueComputationSpeed
  ): Promise<SuccessReponse | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = `lint/${modelId}/${speed}/cancel`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateResponse<SuccessReponse>(call, res)
  }

  public async listModels(appId: string): Promise<ListModelsResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'models'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateResponse<ListModelsResponseBody>(call, res)
  }

  public async pruneModels(appId: string): Promise<PruneModelsResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'models/prune'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateResponse<PruneModelsResponseBody>(call, res)
  }

  public async detectLanguage(
    appId: string,
    body: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = 'detect-lang'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateResponse<DetectLangResponseBody>(call, res)
  }

  public async predict(
    appId: string,
    modelId: string,
    body: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse> {
    const headers = appIdHeader(appId)
    const ressource = `predict/${modelId}`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateResponse<PredictResponseBody>(call, res)
  }

  private _post = async (
    call: HTTPCall<'POST'>,
    body?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<any>> => {
    try {
      const { ressource } = call
      const res = await this._axios.post(ressource, body, config)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapErr(call, err)
    }
  }

  private _get = async (call: HTTPCall<'GET'>, config?: AxiosRequestConfig): Promise<AxiosResponse<any>> => {
    try {
      const { ressource } = call
      const res = await this._axios.get(ressource, config)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapErr(call, err)
    }
  }

  private _mapErr = (call: HTTPCall<HTTPVerb>, thrown: any): ClientResponseError => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    const httpStatus = -1
    return new ClientResponseError(call, httpStatus, err.message)
  }
}
