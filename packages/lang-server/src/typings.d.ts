type CommonOptions = {
  langDir: string
  metadataLocation: string
  dim: number
  domain: string
}

export type LogFormat = 'text' | 'json'
export type LangServerOptions = {
  port: number
  host: string
  limit: number
  limitWindow: string
  authToken?: string
  adminToken?: string
  offline: boolean
  logLevel: number
  logFormat: LogFormat
  debugFilter?: string
} & CommonOptions

export type DownloadOptions = {
  lang: string
} & CommonOptions

export type LangArgv = Partial<LangServerOptions>
export type DownloadArgv = Partial<CommonOptions> & { lang: string }

export const version: string
export const run: (argv: LangArgv) => Promise<void>
export const download: (argv: DownloadArgv) => Promise<void>
