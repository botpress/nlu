import { LogLevel } from '@botpress/logger'
import { LogFormat } from '@botpress/nlu-server'
import { asYargs } from '../yargs-utils'

const logFormatChoices: LogFormat[] = ['json', 'text']
const logLevelChoices: LogLevel[] = ['critical', 'error', 'warning', 'info', 'debug']

export const parameters = asYargs({
  port: {
    description: 'The port to listen to',
    type: 'number'
  },
  host: {
    description: 'Binds the nlu server to a specific hostname',
    type: 'string'
  },
  modelDir: {
    description: 'Directory where to persist models',
    type: 'string'
  },
  modelTTL: {
    description: 'Time in ms before model is deleted',
    type: 'number'
  },
  limit: {
    description: 'Maximum number of requests per IP per "limitWindow" interval (0 means unlimited)',
    type: 'number'
  },
  limitWindow: {
    description: 'Time window on which the limit is applied (use standard notation, ex: 25m or 1h)',
    type: 'string'
  },
  bodySize: {
    description: 'Allowed size of HTTP requests body',
    type: 'string'
  },
  logLevel: {
    description: 'Verbosity level of the logging. Does not apply to booting logs.',
    choices: logLevelChoices
  },
  logFormat: {
    description: 'Weither to log using JSON or good old fashion formatted text with colors.',
    choices: logFormatChoices
  },
  debugFilter: {
    description: 'Regexp to filter debug logs by namespace. Only applies if log level is "debug".',
    type: 'string'
  }
})
