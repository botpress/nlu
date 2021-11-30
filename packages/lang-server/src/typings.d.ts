interface CommonOptions {
  langDir: string
  metadataLocation: string
  dim: number
  domain: string
}

export interface LangServerOptions extends CommonOptions {
  port: number
  host: string
  limit: number
  limitWindow: string
  authToken?: string
  adminToken?: string
  offline: boolean
  verbose: number
  logFilter?: string[]
}

export interface DownloadOptions extends CommonOptions {
  lang: string
}

export type LangArgv = Partial<LangServerOptions>
export type DownloadArgv = Partial<CommonOptions> & { lang: string }

export const version: string
export const run: (argv: LangArgv) => Promise<void>
export const download: (argv: DownloadArgv) => Promise<void>
