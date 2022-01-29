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
  logLevel: number
  logFormat: LogFormat
  debugFilter?: string
  apmEnabled?: boolean
  apmSampleRate?: number
  maxTraining: number
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
}

export type CommandLineOptions = Partial<NLUServerOptions>

export const version: string
export const run: (argv: CommandLineOptions) => Promise<void>
