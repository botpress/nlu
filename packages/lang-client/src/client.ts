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
  SuccessReponse,
  TokenizeRequestBody,
  VectorizeRequestBody
} from './typings'

import { responseValidator, HTTPCall, ClientResponseError, HTTPVerb } from './validation'

const DEFAULT_CONFIG: AxiosRequestConfig = {
  validateStatus: () => true
}

const baseURL = 'lang-server'

export class LangClient implements IClient {
  protected _axios: AxiosInstance

  constructor(config: ClientConfig) {
    this._axios = axios.create({ ...DEFAULT_CONFIG, ...config })
  }

  public get axios() {
    return this._axios
  }

  public async getInfo(): Promise<InfoResponseBody | ErrorResponse> {
    const ressource = 'info'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._get(call)
    return validateResponse<InfoResponseBody>(res)
  }

  public async tokenize(utterances: string[], language: string): Promise<TokenizeResponseBody | ErrorResponse> {
    const ressource = 'tokenize'
    const body: TokenizeRequestBody = { utterances, language }
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call, body)
    return validateResponse<TokenizeResponseBody>(res)
  }

  public async vectorize(tokens: string[], language: string): Promise<VectorizeResponseBody | ErrorResponse> {
    const ressource = 'vectorize'
    const body: VectorizeRequestBody = { tokens, language }
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call, body)
    return validateResponse<VectorizeResponseBody>(res)
  }

  public async getLanguages(): Promise<LanguagesResponseBody | ErrorResponse> {
    const ressource = 'languages'
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._get(call)
    return validateResponse<LanguagesResponseBody>(res)
  }

  public async startDownload(lang: string): Promise<DownloadLangResponseBody | ErrorResponse> {
    const ressource = `languages/${lang}`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call)
    return validateResponse<DownloadLangResponseBody>(res)
  }

  public async deleteLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/${lang}/delete`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call)
    return validateResponse<SuccessReponse>(res)
  }

  public async loadLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/${lang}/load`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call)
    return validateResponse<SuccessReponse>(res)
  }

  public async cancelDownload(downloadId: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/cancel/${downloadId}`
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource, baseURL }
    const validateResponse = responseValidator(call)
    const res = await this._post(call)
    return validateResponse<SuccessReponse>(res)
  }

  private _post = async (call: HTTPCall<'POST'>, body?: any): Promise<AxiosResponse<any>> => {
    try {
      const { ressource } = call
      const res = await this._axios.post(ressource, body)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapErr(call, err)
    }
  }

  private _get = async (call: HTTPCall<'GET'>): Promise<AxiosResponse<any>> => {
    try {
      const { ressource } = call
      const res = await this._axios.get(ressource)
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
