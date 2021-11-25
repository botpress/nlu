import './rewire'
import { run as runLanguageServer, download as downloadLang, version as langServerVersion } from '@botpress/lang-server'
import { makeLogger } from '@botpress/logger'
import { run as runNLUServer, version as nluServerVersion } from '@botpress/nlu-server'
import path from 'path'
import yargs from 'yargs'
import { writeConfigFile } from './config-file'
import { nluServerParameters, langServerParameters, langDownloadParameters } from './parameters'
import { parseEnv } from './parse-env'

void yargs
  .version(false)
  .command(['nlu', '$0'], 'Launch a local standalone nlu server', (yargs) => {
    return yargs
      .command('$0', 'Launch a local standalone nlu server', nluServerParameters, (argv) => {
        const baseLogger = makeLogger()
        if (argv.version) {
          baseLogger.sub('Version').info(nluServerVersion)
          return
        }

        argv = parseEnv(nluServerParameters, argv)
        void runNLUServer(argv).catch((err) => {
          baseLogger.sub('Exit').attachError(err).critical('NLU Server exits after an error occured.')
          process.exit(1)
        })
      })
      .command('init', 'create configuration file in current working directory', {}, (argv) => {
        return writeConfigFile({
          schemaLocation: path.join(process.cwd(), 'nlu-server.json'),
          fileLocation: path.join(process.cwd(), 'nlu-server.schema.json'),
          yargSchema: nluServerParameters
        })
      })
  })
  .command('lang', 'Launch a local language server', (yargs) => {
    const baseLogger = makeLogger({ prefix: 'LANG' })
    return yargs
      .command('$0', 'Launch a local language server', langServerParameters, (argv) => {
        if (argv.version) {
          baseLogger.sub('Version').info(langServerVersion)
          return
        }

        argv = parseEnv(langServerParameters, argv)
        void runLanguageServer(argv).catch((err) => {
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
      .command('download', 'Download a language model for lang and dim', langDownloadParameters, (argv) => {
        argv = parseEnv(langDownloadParameters, argv)
        void downloadLang(argv).catch((err) => {
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
  })
  .help().argv
