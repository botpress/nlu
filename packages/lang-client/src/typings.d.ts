import { AxiosRequestConfig, AxiosInstance } from 'axios'

/**
 * ###################
 * ### Basic Types ###
 * ###################
 */
export interface LanguageInfo {
  version: string
  ready: boolean
  dimentions: number
  domain: string
  readOnly: boolean
}

export interface TokenizeResult {
  utterances: string[]
  language: string
  tokens: string[][]
}

export interface VectorizeResult {
  language: string
  vectors: number[][]
}

export interface AvailableModel {
  code: string
  name: string
  flag: string
}

export interface InstalledModel {
  code: string
  name: string
  loaded: boolean
}

export type DownloadStatusType = 'pending' | 'downloading' | 'loading' | 'errored' | 'done'
export interface DownloadStatus {
  status: DownloadStatusType
  message: string
}

export interface DownloadProgress {
  status: DownloadStatus
  downloadId: string
  size: number
}

export interface DownloadingModel {
  lang: string
  progress: DownloadProgress
}

export interface LanguageState {
  available: AvailableModel[]
  installed: InstalledModel[]
  downloading: DownloadingModel[]
}

export interface DownloadStartResult {
  downloadId: string
}

/**
 * ##########################
 * ### HTTP Communication ###
 * ##########################
 */
export type ErrorType = 'bad_request' | 'not_ready' | 'unauthorized' | 'offline' | 'unknown'
export interface LangError {
  message: string
  stack?: string
  type: ErrorType
  code: number
}

export interface ErrorResponse {
  success: false
  error: LangError
}

export interface SuccessReponse {
  success: true
}

export interface InfoResponseBody extends SuccessReponse, LanguageInfo {}
export interface TokenizeResponseBody extends SuccessReponse, TokenizeResult {}
export interface VectorizeResponseBody extends SuccessReponse, VectorizeResult {}
export interface LanguagesResponseBody extends SuccessReponse, LanguageState {}
export interface DownloadResponseBody extends SuccessReponse, DownloadStartResult {}

/**
 * ####################
 * ### Client Class ###
 * ####################
 */
export type ClientConfig = AxiosRequestConfig & {
  authToken: string
}

export class Client {
  readonly axios: AxiosInstance

  constructor(config: LangClientConfig)

  getInfo(): Promise<InfoResponseBody | ErrorResponse>
  tokenize(utterances: string[], language: string): Promise<TokenizeResponseBody | ErrorResponse>
  vectorize(tokens: string[], language: string): Promise<VectorizeResponseBody | ErrorResponse>
  getLanguages(): Promise<LanguagesResponseBody | ErrorResponse>
  startDownload(lang: string): Promise<DownloadResponseBody | ErrorResponse>
  deleteLang(lang: string): Promise<SuccessReponse | ErrorResponse>
  loadLang(lang: string): Promise<SuccessReponse | ErrorResponse>
  cancelDownload(downloadId: string): Promise<SuccessReponse | ErrorResponse>
}
