export const run: (argv: {
  port: number
  host: string
  limit: number
  limitWindow: string
  langDir?: string
  authToken?: string
  adminToken?: string
  metadataLocation: string
  offline: boolean
  dim: number
  domain: string
  verbose: number
  logFilter: string[] | undefined
}) => Promise<void>

export const download: (argv: {
  langDir?: string
  lang: string
  dim: number
  domain: string
  metadataLocation: string
}) => Promise<void>

export const version: string
