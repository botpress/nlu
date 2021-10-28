import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import _ from 'lodash'
import {
  Client as IClient,
  LangClientConfig as ClientConfig,
  InfoResponseBody,
  TokenizeResponseBody,
  VectorizeResponseBody,
  LanguagesResponseBody,
  DownloadResponseBody,
  ErrorResponse,
  SuccessReponse
} from './typings'

import { validateResponse } from './validation'

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
    const { data } = await this._axios.get('info')
    return validateResponse<InfoResponseBody>(data)
  }

  public async tokenize(utterances: string[], language: string): Promise<TokenizeResponseBody | ErrorResponse> {
    const { data } = await this._axios.get('tokenize')
    return validateResponse<TokenizeResponseBody>(data)
  }

  public async vectorize(tokens: string[], language: string): Promise<VectorizeResponseBody | ErrorResponse> {
    const { data } = await this._axios.get('vectorize')
    return validateResponse<VectorizeResponseBody>(data)
  }

  public async getLanguages(): Promise<LanguagesResponseBody | ErrorResponse> {
    const { data } = await this._axios.get('languages')
    return validateResponse<LanguagesResponseBody>(data)
  }

  public async startDownload(lang: string): Promise<DownloadResponseBody | ErrorResponse> {
    const { data } = await this._axios.get(`languages/${lang}`)
    return validateResponse<DownloadResponseBody>(data)
  }

  public async deleteLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const { data } = await this._axios.get(`languages/${lang}/delete`)
    return validateResponse<SuccessReponse>(data)
  }

  public async loadLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const { data } = await this._axios.get(`languages/${lang}/load`)
    return validateResponse<SuccessReponse>(data)
  }

  public async cancelDownload(downloadId: string): Promise<SuccessReponse | ErrorResponse> {
    const { data } = await this._axios.get(`languages/cancel/${downloadId}`)
    return validateResponse<SuccessReponse>(data)
  }
}
