import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

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

import { responseValidator } from './validation'

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
    const ressource = 'info'
    const validateResponse = responseValidator({ verb: 'GET', ressource })
    const res = await this._axios.get(ressource)
    return validateResponse<InfoResponseBody>(res)
  }

  public async tokenize(utterances: string[], language: string): Promise<TokenizeResponseBody | ErrorResponse> {
    const ressource = 'tokenize'
    const body: TokenizeRequestBody = { utterances, language }
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource, body)
    return validateResponse<TokenizeResponseBody>(res)
  }

  public async vectorize(tokens: string[], language: string): Promise<VectorizeResponseBody | ErrorResponse> {
    const ressource = 'vectorize'
    const body: VectorizeRequestBody = { tokens, language }
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource, body)
    return validateResponse<VectorizeResponseBody>(res)
  }

  public async getLanguages(): Promise<LanguagesResponseBody | ErrorResponse> {
    const ressource = 'languages'
    const validateResponse = responseValidator({ verb: 'GET', ressource })
    const res = await this._axios.get(ressource)
    return validateResponse<LanguagesResponseBody>(res)
  }

  public async startDownload(lang: string): Promise<DownloadLangResponseBody | ErrorResponse> {
    const ressource = `languages/${lang}`
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource)
    return validateResponse<DownloadLangResponseBody>(res)
  }

  public async deleteLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/${lang}/delete`
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource)
    return validateResponse<SuccessReponse>(res)
  }

  public async loadLang(lang: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/${lang}/load`
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource)
    return validateResponse<SuccessReponse>(res)
  }

  public async cancelDownload(downloadId: string): Promise<SuccessReponse | ErrorResponse> {
    const ressource = `languages/cancel/${downloadId}`
    const validateResponse = responseValidator({ verb: 'POST', ressource })
    const res = await this._axios.post(ressource)
    return validateResponse<SuccessReponse>(res)
  }
}
