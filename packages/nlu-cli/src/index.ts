import './rewire'
import { run as runLanguageServer, download as downloadLang, version as langServerVersion } from '@botpress/lang-server'
import { Logger } from '@botpress/logger'
import { run as runNLUServer, version as nluServerVersion } from '@botpress/nlu-server'
import path from 'path'
import yargs from 'yargs'
import { getAppDataPath } from './app-data'
import { writeConfigFile, readConfigFile } from './config-file'
import { nluServerParameters, langServerParameters, langDownloadParameters } from './parameters'
import { parseEnv } from './parse-env'

void yargs
  .version(false)
  .command(['nlu', '$0'], 'Launch a local standalone nlu server', (yargs) => {
    const nluLogger = new Logger('', { prefix: 'NLU' })
    return yargs
      .command(
        '$0',
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
          ...nluServerParameters
        },
        async (argv) => {
          if (argv.version) {
            nluLogger.sub('Version').info(nluServerVersion)
            return
          }
          if (argv.config) {
            const fileArgs = await readConfigFile({
              fileLocation: argv.config,
              yargSchema: nluServerParameters
            })
            argv = { ...fileArgs, ...argv }
          }

          argv = { ...parseEnv(nluServerParameters), ...argv }
          void runNLUServer(argv).catch((err) => {
            nluLogger.sub('Exit').attachError(err).critical('NLU Server exits after an error occured.')
            process.exit(1)
          })
        }
      )
      .command(
        'init',
        'create configuration file in current working directory',
        {
          config: {
            alias: 'c',
            description: 'Path to where you want your config file to be created.',
            type: 'string'
          },
          force: {
            alias: 'f',
            description: 'Weither or not to override current file.',
            type: 'boolean'
          }
        },
        (argv) => {
          const { force, config } = argv

          const defaultFileLocation = path.join(process.cwd(), 'nlu.config.json')
          const fileLocation = config || defaultFileLocation

          const cachePath = getAppDataPath()
          void writeConfigFile({
            fileLocation,
            schemaLocation: path.join(cachePath, 'nlu.config.schema.json'),
            yargSchema: nluServerParameters,
            force
          }).catch((err) => {
            nluLogger.sub('Exit').attachError(err).critical('Could not initialize configuration file.')
            process.exit(1)
          })
        }
      )
  })
  .command('lang', 'Launch a local language server', (yargs) => {
    const langLogger = new Logger('', { prefix: 'LANG' })
    return yargs
      .command(
        '$0',
        'Launch a local language server',
        {
          version: {
            description: "Prints the Lang Server's version",
            type: 'boolean',
            default: false
          },
          config: {
            description: 'Path to your config file. If defined, rest of the CLI arguments are ignored.',
            type: 'string',
            alias: 'c'
          },
          ...langServerParameters
        },
        async (argv) => {
          if (argv.version) {
            langLogger.sub('Version').info(langServerVersion)
            return
          }
          if (argv.config) {
            const fileArgs = await readConfigFile({
              fileLocation: argv.config,
              yargSchema: langServerParameters
            })
            argv = { ...fileArgs, ...argv }
          }

          argv = { ...parseEnv(langServerParameters), ...argv }
          void runLanguageServer(argv).catch((err) => {
            langLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
            process.exit(1)
          })
        }
      )
      .command(
        'init',
        'create configuration file in current working directory',
        {
          config: {
            alias: 'c',
            description: 'Path to where you want your config file to be created.',
            type: 'string'
          },
          force: {
            alias: 'f',
            description: 'Weither or not to override current file.',
            type: 'boolean'
          }
        },
        (argv) => {
          const { force, config } = argv

          const defaultFileLocation = path.join(process.cwd(), 'lang.config.json')
          const fileLocation = config || defaultFileLocation

          const cachePath = getAppDataPath()
          void writeConfigFile({
            fileLocation,
            schemaLocation: path.join(cachePath, 'lang.config.schema.json'),
            yargSchema: langServerParameters,
            force
          }).catch((err) => {
            langLogger.sub('Exit').attachError(err).critical('Could not initialize configuration file.')
            process.exit(1)
          })
        }
      )
      .command('download', 'Download a language model for lang and dim', langDownloadParameters, (argv) => {
        argv = { ...parseEnv(langDownloadParameters), ...argv }
        void downloadLang(argv).catch((err) => {
          langLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
  })
  .help().argv
