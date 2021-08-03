import fse from 'fs-extra'
import { APIOptions } from './api/app'
import { getAppDataPath } from './app-data'

interface LanguageSource {
  endpoint: string
  authToken?: string
}

export type CommandLineOptions = APIOptions & {
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
  config?: string
}

export type StanOptions = APIOptions & {
  languageSources: LanguageSource[] // when passed by env variable, there can be more than one lang server
  ducklingURL: string
  ducklingEnabled: boolean
  legacyElection: boolean // not available from CLI
}

const DEFAULT_OPTIONS: StanOptions = {
  host: 'localhost',
  port: 3200,
  limit: 0,
  limitWindow: '1h',
  bodySize: '2mb',
  batchSize: 1,
  languageSources: [{ endpoint: 'http://localhost:3100' }],
  ducklingURL: 'http://localhost:8000',
  ducklingEnabled: true,
  modelCacheSize: '2.5gb',
  verbose: 3,
  doc: false,
  logFilter: [],
  legacyElection: false,
  modelDir: getAppDataPath()
}

type ConfigSource = 'environment' | 'cli' | 'file'

const _mapCli = (c: CommandLineOptions): StanOptions => {
  const { ducklingEnabled, ducklingURL, modelCacheSize, languageURL, languageAuthToken } = c
  return {
    ...c,
    languageSources: [
      {
        endpoint: languageURL,
        authToken: languageAuthToken
      }
    ],
    ducklingEnabled,
    ducklingURL,
    modelCacheSize,
    legacyElection: false
  }
}

const readEnvJSONConfig = (): StanOptions | null => {
  const rawContent = process.env.NLU_SERVER_CONFIG
  if (!rawContent) {
    return null
  }
  try {
    const parsedContent = JSON.parse(rawContent)
    return { ...DEFAULT_OPTIONS, ...parsedContent }
  } catch {
    return null
  }
}

const readFileConfig = async (configPath: string): Promise<StanOptions> => {
  try {
    const rawContent = await fse.readFile(configPath, 'utf8')
    const parsedContent = JSON.parse(rawContent)
    return { ...DEFAULT_OPTIONS, ...parsedContent }
  } catch (err) {
    const e = new Error(`The following errored occured when reading config file "${configPath}": ${err.message}`)
    e.stack = err.stack
    throw e
  }
}

export const getConfig = async (c: CommandLineOptions): Promise<{ options: StanOptions; source: ConfigSource }> => {
  const envConfig = readEnvJSONConfig()
  if (envConfig) {
    return { options: envConfig, source: 'environment' }
  }

  if (c.config) {
    const options = await readFileConfig(c.config)
    return { options, source: 'file' }
  }

  const options = _mapCli(c)
  return { options, source: 'cli' }
}
