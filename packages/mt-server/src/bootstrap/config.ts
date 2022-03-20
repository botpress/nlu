import { LogLevel } from '@botpress/logger'
import ms from 'ms'
import { getAppDataPath } from '../app-data'

export type LogFormat = 'text' | 'json'
export type ModelTransferOptions = {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string | number
  reverseProxy: string | undefined
  modelDir: string
  modelTTL: number
  logLevel: LogLevel
  logFormat: LogFormat
  debugFilter?: string
}

const DEFAULT_OPTIONS = (): ModelTransferOptions => ({
  port: 3200,
  host: 'localhost',
  limitWindow: '1h',
  limit: 0,
  bodySize: Infinity,
  reverseProxy: undefined,
  modelDir: getAppDataPath(),
  modelTTL: ms('5m'),
  logLevel: 'info',
  debugFilter: undefined,
  logFormat: 'text'
})

export type CommandLineOptions = Partial<ModelTransferOptions>
export const getConfig = async (cliOptions: CommandLineOptions): Promise<ModelTransferOptions> => {
  const defaults = DEFAULT_OPTIONS()
  const options: ModelTransferOptions = { ...defaults, ...cliOptions }
  return options
}
