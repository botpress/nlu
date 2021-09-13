interface BuildInfo {
  date: number
  branch: string
}

interface Options {
  host: string
  port: number
  authToken?: string
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
}

export const run: (argv: Options) => Promise<void>
