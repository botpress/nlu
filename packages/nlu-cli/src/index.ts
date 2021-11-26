import './rewire'
import { run as runLanguageServer, download as downloadLang, version as langServerVersion } from '@botpress/lang-server'
import { makeLogger } from '@botpress/logger'
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
          const baseLogger = makeLogger({ prefix: 'NLU' })
          if (argv.version) {
            baseLogger.sub('Version').info(nluServerVersion)
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
            baseLogger.sub('Exit').attachError(err).critical('NLU Server exits after an error occured.')
            process.exit(1)
          })
        }
      )
      .command('init', 'create configuration file in current working directory', {}, (argv) => {
        const cachePath = getAppDataPath()
        return writeConfigFile({
          fileLocation: path.join(process.cwd(), 'nlu.config.json'),
          schemaLocation: path.join(cachePath, 'nlu.config.schema.json'),
          yargSchema: nluServerParameters
        })
      })
  })
  .command('lang', 'Launch a local language server', (yargs) => {
    const baseLogger = makeLogger({ prefix: 'LANG' })
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
            baseLogger.sub('Version').info(langServerVersion)
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
            baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
            process.exit(1)
          })
        }
      )
      .command('init', 'create configuration file in current working directory', {}, (argv) => {
        const cachePath = getAppDataPath()
        return writeConfigFile({
          fileLocation: path.join(process.cwd(), 'lang.config.json'),
          schemaLocation: path.join(cachePath, 'lang.config.schema.json'),
          yargSchema: langServerParameters
        })
      })
      .command('download', 'Download a language model for lang and dim', langDownloadParameters, (argv) => {
        argv = { ...parseEnv(langDownloadParameters), ...argv }
        void downloadLang(argv).catch((err) => {
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
  })
  .help().argv
