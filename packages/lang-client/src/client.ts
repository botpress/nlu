import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import _ from 'lodash'
import {
  Client as IClient,
  LangClientConfig as ClientConfig,
  InfoResponseBody,
  TokenizeResponseBody,
  VectorizeResponseBody,
  LanguagesResponseBody,
  DownloadLangResponseBody,
  ErrorResponse,
  SuccessResponse,
  TokenizeRequestBody,
  VectorizeRequestBody
} from './typings'

import { validateResponse, HTTPCall, ClientResponseError, HTTPVerb } from './validation'

const DEFAULT_CONFIG: AxiosRequestConfig = {
  validateStatus: () => true
}

export class LangClient implements IClient {
  protected _axios: AxiosInstance

  constructor(config: ClientConfig) {
    this._axios = axios.create({ ...DEFAULT_CONFIG, ...config })
  }

  public get axios() {
    return this._axios
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    const resource = 'info'
    const call: HTTPCall<'GET'> = { verb: 'GET', resource }
    const res = await this._get(call)
    return validateResponse<InfoResponseBody>(call, res)
  }

  public async tokenize(utterances: string[], lang: string): Promise<TokenizeResponseBody | ErrorResponse> {
    const resource = `tokenize/${lang}`
    const body: TokenizeRequestBody = { utterances }
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call, body)
    return validateResponse<TokenizeResponseBody>(call, res)
  }

  public async vectorize(tokens: string[], lang: string): Promise<VectorizeResponseBody | ErrorResponse> {
    const resource = `vectorize/${lang}`
    const body: VectorizeRequestBody = { tokens }
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call, body)
    return validateResponse<VectorizeResponseBody>(call, res)
  }

  public async getLanguages(): Promise<LanguagesResponseBody | ErrorResponse> {
    const resource = 'languages'
    const call: HTTPCall<'GET'> = { verb: 'GET', resource }
    const res = await this._get(call)
    return validateResponse<LanguagesResponseBody>(call, res)
  }

  public async startDownload(lang: string): Promise<DownloadLangResponseBody | ErrorResponse> {
    const resource = `languages/${lang}`
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call)
    return validateResponse<DownloadLangResponseBody>(call, res)
  }

  public async deleteLang(lang: string): Promise<SuccessResponse | ErrorResponse> {
    const resource = `languages/${lang}/delete`
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call)
    return validateResponse<SuccessResponse>(call, res)
  }

  public async loadLang(lang: string): Promise<SuccessResponse | ErrorResponse> {
    const resource = `languages/${lang}/load`
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call)
    return validateResponse<SuccessResponse>(call, res)
  }

  public async cancelDownload(downloadId: string): Promise<SuccessResponse | ErrorResponse> {
    const resource = `languages/cancel/${downloadId}`
    const call: HTTPCall<'POST'> = { verb: 'POST', resource }
    const res = await this._post(call)
    return validateResponse<SuccessResponse>(call, res)
  }

  private _post = async (call: HTTPCall<'POST'>, body?: any): Promise<AxiosResponse<any>> => {
    try {
      const { resource } = call
      const res = await this._axios.post(resource, body)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapErr(call, err)
    }
  }

  private _get = async (call: HTTPCall<'GET'>): Promise<AxiosResponse<any>> => {
    try {
      const { resource } = call
      const res = await this._axios.get(resource)
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
