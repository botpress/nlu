import { LogFormat } from '@botpress/nlu-server'
import { asYargs } from '../yargs-utils'

const logFormatChoices: LogFormat[] = ['json', 'text']

export const parameters = asYargs({
  port: {
    description: 'The port to listen to',
    type: 'number'
  },
  host: {
    description: 'Binds the nlu server to a specific hostname',
    type: 'string'
  },
  dbURL: {
    description: 'URL of database where to persist models. If undefined, models are stored on FS.',
    type: 'string'
  },
  modelDir: {
    description: 'Directory where to persist models, ignored if dbURL is set.',
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
  languageURL: {
    description: 'URL of your language server',
    type: 'string'
  },
  languageAuthToken: {
    description: 'Authentication token for your language server',
    type: 'string'
  },
  tracingEnabled: {
    description: 'When enabled, a tracing client is configured using opentelemetry',
    type: 'boolean'
  },
  prometheusEnabled: {
    description: 'When enabled, a prometheus endpoint will be avaiable at /metrics',
    type: 'boolean'
  },
  apmEnabled: {
    description:
      'When enabled, Sentry is added to the express server allowing the use of the environment variables SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE',
    type: 'boolean'
  },
  apmSampleRate: {
    description: 'If apm is configured, this option sets the sample rate of traces',
    type: 'number'
  },
  ducklingURL: {
    description: 'URL of your Duckling server; Only relevant if "ducklingEnabled" is true',
    type: 'string'
  },
  ducklingEnabled: {
    description: 'Whether or not to enable Duckling',
    type: 'boolean'
  },
  bodySize: {
    description: 'Allowed size of HTTP requests body',
    type: 'string'
  },
  batchSize: {
    description: 'Allowed number of text inputs in one call to POST /predict',
    type: 'number'
  },
  modelCacheSize: {
    description: 'Max allocated memory for model cache. Too few memory will result in more access to file system.',
    type: 'string'
  },
  doc: {
    description: 'Whether or not to display documentation on start',
    type: 'boolean'
  },
  logLevel: {
    alias: 'verbose',
    description: 'Verbosity level of the logging, integer from 0 to 4. Does not apply to booting logs.',
    type: 'number'
  },
  logFormat: {
    description: 'Weither to log using JSON or good old fashion formatted text with colors.',
    choices: logFormatChoices
  },
  debugFilter: {
    description: 'Regexp to filter debug logs by namespace. Only applies if log level is 4.',
    type: 'string'
  },
  maxTraining: {
    description: 'The max allowed amount of simultaneous trainings on a single instance',
    type: 'number'
  },
  usageURL: {
    description: 'Endpoint to send usage info to.',
    type: 'string'
  }
})
