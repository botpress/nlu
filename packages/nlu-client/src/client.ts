import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import _ from 'lodash'
import { ModelStreamer } from './model-streamer'
import { BufferOpts, Client as IClient, DownloadOpts, IssueComputationSpeed, ModelStream, StreamOpts } from './typings'
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
import { validateJSONResponse, HTTPCall, HTTPVerb, ClientResponseError } from './validation'

const DEFAULT_CONFIG: AxiosRequestConfig = {
  validateStatus: () => true
}

export const APP_HEADER = (appId: string) => {
  return {
    'X-App-Id': appId
  }
}

export class NLUClient implements IClient {
  protected _axios: AxiosInstance

  private _modelStreamer: ModelStreamer

  constructor(config: AxiosRequestConfig) {
    this._axios = axios.create({ ...DEFAULT_CONFIG, ...config })
    this._modelStreamer = new ModelStreamer(this._axios)
  }

  public get axios() {
    return this._axios
  }

  public async downloadModel(appId: string, modelId: string): Promise<ModelStream | ErrorResponse>
  public async downloadModel(appId: string, modelId: string, opt: StreamOpts): Promise<ModelStream | ErrorResponse>
  public async downloadModel(appId: string, modelId: string, opt: BufferOpts): Promise<Buffer | ErrorResponse>
  public async downloadModel(
    appId: string,
    modelId: string,
    opt?: DownloadOpts
  ): Promise<ModelStream | Buffer | ErrorResponse> {
    const ressource = `model/${modelId}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }

    try {
      if (!opt || opt.responseType === 'stream') {
        return this._modelStreamer.downloadStreamModel(appId, modelId)
      }
      return this._modelStreamer.downloadBufferModel(appId, modelId)
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapErr(call, err)
    }
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    const ressource = 'info'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call)
    return validateJSONResponse<InfoResponseBody>(call, res)
  }

  public async startTraining(appId: string, body: TrainRequestBody): Promise<TrainResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'train'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateJSONResponse<TrainResponseBody>(call, res)
  }

  /**
   * @experimental still subject to breaking changes
   */
  public async startLinting(appId: string, body: LintRequestBody): Promise<LintResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'lint'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateJSONResponse<LintResponseBody>(call, res)
  }

  public async listTrainings(appId: string, lang?: string): Promise<ListTrainingsResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'train'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const params = lang && { lang }
    const res = await this._get(call, { headers, params })
    return validateJSONResponse<ListTrainingsResponseBody>(call, res)
  }

  public async getTrainingStatus(appId: string, modelId: string): Promise<TrainProgressResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = `train/${modelId}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateJSONResponse<TrainProgressResponseBody>(call, res)
  }

  /**
   * @experimental still subject to breaking changes
   */
  public async getLintingStatus(
    appId: string,
    modelId: string,
    speed: IssueComputationSpeed
  ): Promise<LintProgressResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = `lint/${modelId}/${speed}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateJSONResponse<LintProgressResponseBody>(call, res)
  }

  public async cancelTraining(appId: string, modelId: string): Promise<SuccessReponse | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = `train/${modelId}/cancel`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateJSONResponse<SuccessReponse>(call, res)
  }

  public async cancelLinting(
    appId: string,
    modelId: string,
    speed: IssueComputationSpeed
  ): Promise<SuccessReponse | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = `lint/${modelId}/${speed}/cancel`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateJSONResponse<SuccessReponse>(call, res)
  }

  public async listModels(appId: string): Promise<ListModelsResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'models'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    const res = await this._get(call, { headers })
    return validateJSONResponse<ListModelsResponseBody>(call, res)
  }

  public async pruneModels(appId: string): Promise<PruneModelsResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'models/prune'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, {}, { headers })
    return validateJSONResponse<PruneModelsResponseBody>(call, res)
  }

  public async detectLanguage(
    appId: string,
    body: DetectLangRequestBody
  ): Promise<DetectLangResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = 'detect-lang'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateJSONResponse<DetectLangResponseBody>(call, res)
  }

  public async predict(
    appId: string,
    modelId: string,
    body: PredictRequestBody
  ): Promise<PredictResponseBody | ErrorResponse> {
    const headers = APP_HEADER(appId)
    const ressource = `predict/${modelId}`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }
    const res = await this._post(call, body, { headers })
    return validateJSONResponse<PredictResponseBody>(call, res)
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
