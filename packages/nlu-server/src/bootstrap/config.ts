import bytes from 'bytes'
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
  batchSize: -1,
  modelCacheSize: '2.5gb',
  doc: false,
  logLevel: 'info',
  debugFilter: undefined,
  logFormat: 'text',
  maxTraining: 2,
  maxLinting: 2
})

export const getConfig = async (cliOptions: CommandLineOptions): Promise<NLUServerOptions> => {
  const defaults = DEFAULT_OPTIONS()
  const options: NLUServerOptions = { ...defaults, ...cliOptions }
  return options
}

export const validateConfig = (options: NLUServerOptions) => {
  if (!bytes(options.bodySize)) {
    throw new Error(`Specified body-size "${options.bodySize}" has an invalid format.`)
  }
}
