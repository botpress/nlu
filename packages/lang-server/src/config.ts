import path from 'path'
import { getAppDataPath } from './app-data'
import { LangServerOptions, DownloadOptions, LangArgv, DownloadArgv } from './typings'

const DEFAULT_LANG_DIR = () => {
  const appDataPath = getAppDataPath()
  return path.join(appDataPath, 'embeddings')
}

const DEFAULT_SERVER_OPTIONS = (): LangServerOptions => ({
  port: 3100,
  host: 'localhost',
  langDir: DEFAULT_LANG_DIR(),
  authToken: undefined,
  adminToken: undefined,
  limit: 0,
  limitWindow: '1h',
  metadataLocation: 'https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json',
  offline: false,
  dim: 100,
  domain: 'bp',
  apmEnabled: false,
  prometheusEnabled: false,
  logLevel: 'info',
  debugFilter: undefined,
  logFormat: 'text'
})

const DEFAULT_DOWNLOAD_OPTIONS = (lang: string): DownloadOptions => ({
  langDir: DEFAULT_LANG_DIR(),
  metadataLocation: 'https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json',
  dim: 100,
  domain: 'bp',
  lang
})

export const getLangServerConfig = (argv: LangArgv): LangServerOptions => {
  return { ...DEFAULT_SERVER_OPTIONS(), ...argv }
}

export const getDownloadConfig = (argv: DownloadArgv): DownloadOptions => {
  return { ...DEFAULT_DOWNLOAD_OPTIONS(argv.lang), ...argv }
}
