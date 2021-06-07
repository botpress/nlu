// eslint-disable-next-line import/order
import Logger from './utils/logger'
import path from 'path'
import yargs from 'yargs'

// @ts-ignore
import { version } from '../package.json'

// eslint-disable-next-line import/order
import './utils/worker-before'

import LANG from './lang-server'
import STAN from './nlu-server'
import { LoggerLevel } from './utils/logger/typings'

process.PROJECT_LOCATION = process.pkg
  ? path.dirname(process.execPath) // We point at the binary path
  : __dirname // e.g. /dist/..

const exitLogger = Logger.sub('exit')

yargs
  .command(
    ['nlu', '$0'],
    'Launch a local stand-alone nlu server',
    {
      config: {
        description: 'Path to your config file. If defined, rest of the CLI arguments are ignored.',
        type: 'string',
        alias: 'c'
      },
      port: {
        description: 'The port to listen to',
        default: 3200
      },
      host: {
        description: 'Binds the nlu server to a specific hostname',
        default: 'localhost'
      },
      dbURL: {
        description: 'URL of database where to persist models. If undefined, models are stored on FS.',
        type: 'string'
      },
      modelDir: {
        description: 'Directory where to persist models, ignored if dbURL is set.',
        default: process.APP_DATA_PATH
      },
      authToken: {
        description: 'When enabled, this token is required for clients to query your nlu server',
        type: 'string'
      },
      limit: {
        description: 'Maximum number of requests per IP per "limitWindow" interval (0 means unlimited)',
        default: 0
      },
      limitWindow: {
        description: 'Time window on which the limit is applied (use standard notation, ex: 25m or 1h)',
        default: '1h'
      },
      languageURL: {
        description: 'URL of your language server',
        default: 'https://lang-01.botpress.io'
      },
      languageAuthToken: {
        description: 'Authentification token for your language server',
        type: 'string'
      },
      ducklingURL: {
        description: 'URL of your Duckling server; Only relevant if "ducklingEnabled" is true',
        default: 'https://duckling.botpress.io'
      },
      ducklingEnabled: {
        description: 'Whether or not to enable Duckling',
        default: true,
        type: 'boolean'
      },
      bodySize: {
        description: 'Allowed size of HTTP requests body',
        default: '250kb'
      },
      batchSize: {
        description: 'Allowed number of text inputs in one call to POST /predict',
        default: -1
      },
      modelCacheSize: {
        description: 'Max allocated memory for model cache. Too few memory will result in more access to file system.',
        default: '850mb'
      },
      verbose: {
        description: 'Verbosity level of the logging, integer from 0 to 4. Does not apply to "Launcher" logger.',
        default: LoggerLevel.Info
      },
      doc: {
        description: 'Whether or not to display documentation on start',
        default: true,
        type: 'boolean'
      },
      logFilter: {
        description:
          'Filter logs by namespace, ex: "--log-filter training:svm api". Namespaces are space separated. Does not apply to "Launcher" logger.',
        array: true,
        type: 'string',
        default: []
      }
    },
    (argv) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      STAN(argv, version).catch((err) => {
        exitLogger.attachError(err).critical('NLU Server exits after an error occured.')
      })
    }
  )
  .command(
    'lang',
    'Launch a local language server',
    {
      port: {
        description: 'The port to listen to',
        default: 3100
      },
      host: {
        description: 'Binds the language server to a specific hostname',
        default: 'localhost'
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
        default: 0
      },
      limitWindow: {
        description: 'Time window on which the limit is applied (use standard notation, ex: 25m or 1h)',
        default: '1h'
      },
      metadataLocation: {
        description: 'URL of metadata file which lists available languages',
        default: 'https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json'
      },
      offline: {
        description: 'Whether or not the language server has internet access',
        type: 'boolean',
        default: false
      },
      dim: {
        default: 100,
        description: 'Number of language dimensions provided (25, 100 or 300 at the moment)'
      },
      domain: {
        description: 'Name of the domain where those embeddings were trained on.',
        default: 'bp'
      },
      verbose: {
        description: 'Verbosity level of the logging, integer from 0 to 4. Does not apply to "Launcher" logger.',
        default: LoggerLevel.Info
      },
      logFilter: {
        description:
          'Filter logs by namespace, ex: "--log-filter training:svm api". Namespaces are space separated. Does not apply to "Launcher" logger.',
        array: true,
        type: 'string',
        default: []
      }
    },
    async (argv) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      LANG(argv).catch((err) => {
        exitLogger.attachError(err).critical('Language Server exits after an error occured.')
      })
    }
  )
  .help().argv
