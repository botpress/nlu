import { AxiosRequestConfig, AxiosInstance } from 'axios'

/**
 * ###################
 * ### Basic Types ###
 * ###################
 */
export type LanguageInfo = {
  version: string
  ready: boolean
  dimentions: number
  domain: string
  readOnly: boolean
}

export type TokenizeResult = {
  utterances: string[]
  language: string
  tokens: string[][]
}

export type VectorizeResult = {
  language: string
  vectors: number[][]
}

export type AvailableModel = {
  code: string
  name: string
  flag: string
}

export type InstalledModel = {
  code: string
  name: string
  loaded: boolean
}

export type DownloadStatusType = 'pending' | 'downloading' | 'loading' | 'errored' | 'done'
export type DownloadStatus = {
  status: DownloadStatusType
  message: string
}

export type DownloadProgress = {
  status: DownloadStatus
  downloadId: string
  size: number
}

export type DownloadingModel = {
  lang: string
  progress: DownloadProgress
}

export type LanguageState = {
  available: AvailableModel[]
  installed: InstalledModel[]
  downloading: DownloadingModel[]
}

export type DownloadStartResult = {
  downloadId: string
}

/**
 * ##########################
 * ### HTTP Communication ###
 * ##########################
 */
export type ErrorType = 'bad_request' | 'not_ready' | 'unauthorized' | 'offline' | 'internal'
export type LangError = {
  message: string
  stack?: string
  type: ErrorType
  code: number
}

export type ErrorResponse = {
  success: false
  error: LangError
}

export type SuccessReponse = {
  success: true
}

export type InfoResponseBody = {} & SuccessReponse & LanguageInfo
export type TokenizeResponseBody = {} & SuccessReponse & TokenizeResult
export type VectorizeResponseBody = {} & SuccessReponse & VectorizeResult
export type LanguagesResponseBody = {} & SuccessReponse & LanguageState
export type DownloadLangResponseBody = {} & SuccessReponse & DownloadStartResult

export type TokenizeRequestBody = {
  utterances: string[]
}

export type VectorizeRequestBody = {
  tokens: string[]
}

/**
 * ####################
 * ### Client Class ###
 * ####################
 */
export type LangClientConfig = AxiosRequestConfig & {
  authToken?: string
}

export class Client {
  readonly axios: AxiosInstance

  constructor(config: LangClientConfig)

  public getInfo(): Promise<InfoResponseBody | ErrorResponse>
  public tokenize(utterances: string[], language: string): Promise<TokenizeResponseBody | ErrorResponse>
  public vectorize(tokens: string[], language: string): Promise<VectorizeResponseBody | ErrorResponse>
  public getLanguages(): Promise<LanguagesResponseBody | ErrorResponse>
  public startDownload(lang: string): Promise<DownloadLangResponseBody | ErrorResponse>
  public deleteLang(lang: string): Promise<SuccessReponse | ErrorResponse>
  public loadLang(lang: string): Promise<SuccessReponse | ErrorResponse>
  public cancelDownload(downloadId: string): Promise<SuccessReponse | ErrorResponse>
}
