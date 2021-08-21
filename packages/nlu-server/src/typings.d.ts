interface Options {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  modelCacheSize: string
  dbURL?: string
  modelDir?: string
  verbose: number
  doc: boolean
  logFilter?: string[]
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
  config?: string
  maxTraining: number
}

export const run: (argv: Options) => Promise<void>
