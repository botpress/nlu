import { LogLevel } from '@botpress/logger'

export type BuildInfo = {
  date: number
  branch: string
}

export type LogFormat = 'text' | 'json'
export type NLUServerOptions = {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  modelCacheSize: string
  dbURL?: string
  modelDir: string
  doc: boolean
  logLevel: LogLevel
  logFormat: LogFormat
  debugFilter?: string
  apmEnabled?: boolean
  apmSampleRate?: number
  maxTraining: number
  maxLinting: number
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
  usageURL?: string
}

export type CommandLineOptions = Partial<NLUServerOptions>
