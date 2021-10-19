// eslint-disable-next-line import/order
import { run as runLanguageServer, download as downloadLang, version as langServerVersion } from '@botpress/lang-server'
import { makeLogger, LoggerLevel } from '@botpress/logger'
import { run as runNLUServer, version as nluServerVersion } from '@botpress/nlu-server'
import path from 'path'
import yargs from 'yargs'
import yn from 'yn'

import { getAppDataPath } from './app-data'
import { requireJSON } from './require-json'

const packageJsonPath = path.resolve(__dirname, '../package.json')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)
if (!packageJson) {
  throw new Error('Could not find package.json at the root of nlu-cli.')
}

const { version: nluCliVersion } = packageJson

yargs
  .version(false)
  .command(
    ['nlu', '$0'],
    'Launch a local standalone nlu server',
    {
      version: {
        description: "Prints the NLU Server's version",
        type: 'boolean',
        default: false
      },
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
        default: getAppDataPath()
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
      apmEnabled: {
        description:
          'When enabled, Sentry is added to the express server allowing the use of the environment variables SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE',
        default: yn(process.env.APM_ENABLED),
        type: 'boolean'
      },
      apmSampleRate: {
        description: 'If apm is configured, this option sets the sample rate of traces',
        default: 1.0,
        type: 'number'
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
        type: 'string'
      }
    },
    (argv) => {
      const baseLogger = makeLogger()
      if (argv.version) {
        baseLogger.sub('Version').info(nluServerVersion)
        return
      }

      void runNLUServer(argv).catch((err) => {
        baseLogger.sub('Exit').attachError(err).critical('NLU Server exits after an error occured.')
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
        type: 'string'
      }
    },
    async (argv) => {
      const baseLogger = makeLogger({ prefix: 'LANG' })
      if (argv.version) {
        baseLogger.sub('Version').info(langServerVersion)
        return
      }

      void runLanguageServer(argv).catch((err) => {
        baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
      })
    }
  )
  .command(
    'download',
    'Download a language model for lang and dim',
    {
      langDir: {
        description: 'Directory where language embeddings will be saved',
        type: 'string'
      },
      metadataLocation: {
        description: 'URL of metadata file which lists available languages',
        default: 'https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json'
      },
      dim: {
        default: 100,
        description: 'Number of language dimensions provided (25, 100 or 300 at the moment)'
      },
      domain: {
        description: 'Name of the domain where those embeddings were trained on.',
        default: 'bp'
      },
      lang: {
        alias: 'l',
        description: 'Language Code to download model from',
        type: 'string',
        demandOption: true
      }
    },
    async (argv) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      downloadLang(argv)
        .then(() => {
          process.exit(0)
        })
        .catch((err) => {
          const baseLogger = makeLogger({ prefix: 'LANG' })
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
        })
    }
  )
  .help().argv
