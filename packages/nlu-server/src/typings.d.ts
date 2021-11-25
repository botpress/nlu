export interface BuildInfo {
  date: number
  branch: string
}

export interface NLUServerOptions {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  modelCacheSize: string
  dbURL?: string
  modelDir: string
  verbose: number
  doc: boolean
  logFilter?: string[]
  apmEnabled?: boolean
  apmSampleRate?: number
  maxTraining: number
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
}

export type CommandLineOptions = Partial<NLUServerOptions> & {
  config?: string
}

export const version: string
export const run: (argv: CommandLineOptions) => Promise<void>
