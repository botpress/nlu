import { LogFormat } from '@botpress/lang-server'
import { LogLevel } from '@bpinternal/log4bot'
import { asYargs } from '@botpress/yargs-extra'

const logFormatChoices: LogFormat[] = ['json', 'text']
const logLevelChoices: LogLevel[] = ['critical', 'error', 'warning', 'info', 'debug']

export const parameters = asYargs({
  port: {
    description: 'The port to listen to',
    type: 'number'
  },
  host: {
    description: 'Binds the language server to a specific hostname',
    type: 'string'
  },
  reverseProxy: {
    description: 'Allows trusting the specified reverse proxy',
    type: 'string'
  },
  langDir: {
    description: 'Directory where language embeddings will be saved',
    type: 'string'
  },
  authToken: {
    description: 'When enabled, this token is required for clients to query your language server',
    type: 'string'
  },
  adminToken: {
    description: 'This token is required to access the server as admin and manage language.',
    type: 'string'
  },
  limit: {
    description: 'Maximum number of requests per IP per "limitWindow" interval (0 means unlimited)',
    type: 'number'
  },
  limitWindow: {
    description: 'Time window on which the limit is applied (use standard notation, ex: 25m or 1h)',
    type: 'string'
  },
  metadataLocation: {
    description: 'URL of metadata file which lists available languages',
    type: 'string'
  },
  offline: {
    description: 'Whether or not the language server has internet access',
    type: 'boolean'
  },
  dim: {
    description: 'Number of language dimensions provided (25, 100 or 300 at the moment)',
    type: 'number'
  },
  domain: {
    description: 'Name of the domain where those embeddings were trained on.',
    type: 'string'
  },
  verbose: {
    description: 'Verbosity level of the logging, integer from 0 to 4. Does not apply to "Launcher" logger.',
    type: 'number'
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
