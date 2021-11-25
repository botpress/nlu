import { LoggerLevel } from '@botpress/logger'
import bytes from 'bytes'
import fse from 'fs-extra'
import { getAppDataPath } from '../app-data'
import { NLUServerOptions, CommandLineOptions } from '../typings'

const DEFAULT_OPTIONS = (): NLUServerOptions => ({
  port: 3200,
  host: 'localhost',
  modelDir: getAppDataPath(),
  dbURL: undefined,
  limit: 0,
  limitWindow: '1h',
  languageURL: 'https://lang-01.botpress.io',
  languageAuthToken: undefined,
  apmEnabled: undefined,
  apmSampleRate: undefined,
  ducklingURL: 'https://duckling.botpress.io',
  ducklingEnabled: true,
  bodySize: '2mb',
  batchSize: 1,
  modelCacheSize: '2.5gb',
  verbose: LoggerLevel.Info,
  doc: true,
  logFilter: undefined,
  maxTraining: 2
})

export type ConfigSource = 'environment' | 'cli' | 'file'

const _mapCli = (c: CommandLineOptions): Partial<NLUServerOptions> => {
  const { ducklingEnabled, ducklingURL, languageURL, languageAuthToken } = c
  return {
    ...c,
    languageURL,
    languageAuthToken,
    ducklingEnabled,
    ducklingURL
  }
}

const readEnvJSONConfig = (): NLUServerOptions | null => {
  const rawContent = process.env.NLU_SERVER_CONFIG
  if (!rawContent) {
    return null
  }
  try {
    const parsedContent = JSON.parse(rawContent)
    const defaults = DEFAULT_OPTIONS()
    return { ...defaults, ...parsedContent }
  } catch {
    return null
  }
}

const readFileConfig = async (configPath: string): Promise<NLUServerOptions> => {
  try {
    const rawContent = await fse.readFile(configPath, 'utf8')
    const parsedContent = JSON.parse(rawContent)
    const defaults = DEFAULT_OPTIONS()
    return { ...defaults, ...parsedContent }
  } catch (err) {
    const e = new Error(`The following errored occured when reading config file "${configPath}": ${err.message}`)
    e.stack = err.stack
    throw e
  }
}

export const getConfig = async (
  c: CommandLineOptions
): Promise<{ options: NLUServerOptions; source: ConfigSource }> => {
  const envConfig = readEnvJSONConfig()
  if (envConfig) {
    return { options: envConfig, source: 'environment' }
  }

  if (c.config) {
    const options = await readFileConfig(c.config)
    return { options, source: 'file' }
  }

  const cliOptions = _mapCli(c)
  const defaults = DEFAULT_OPTIONS()
  const options: NLUServerOptions = { ...defaults, ...cliOptions }
  return { options, source: 'cli' }
}

export const validateConfig = (options: NLUServerOptions) => {
  if (!bytes(options.bodySize)) {
    throw new Error(`Specified body-size "${options.bodySize}" has an invalid format.`)
  }
}
