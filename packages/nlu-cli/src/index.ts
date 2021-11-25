import './rewire'
import { run as runLanguageServer, download as downloadLang, version as langServerVersion } from '@botpress/lang-server'
import { makeLogger } from '@botpress/logger'
import { run as runNLUServer, version as nluServerVersion } from '@botpress/nlu-server'
import yargs from 'yargs'
import { nluServerParameters, langServerParameters, langDownloadParameters } from './parameters'

void yargs
  .version(false)
  .command(['nlu', '$0'], 'Launch a local standalone nlu server', nluServerParameters, (argv) => {
    const baseLogger = makeLogger()
    if (argv.version) {
      baseLogger.sub('Version').info(nluServerVersion)
      return
    }

    void runNLUServer(argv).catch((err) => {
      baseLogger.sub('Exit').attachError(err).critical('NLU Server exits after an error occured.')
      process.exit(1)
    })
  })
  .command('lang', 'Launch a local language server', (yargs) => {
    return yargs
      .command('$0', 'Launch a local language server', langServerParameters, (argv) => {
        const baseLogger = makeLogger({ prefix: 'LANG' })
        if (argv.version) {
          baseLogger.sub('Version').info(langServerVersion)
          return
        }

        void runLanguageServer(argv).catch((err) => {
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
      .command('download', 'Download a language model for lang and dim', langDownloadParameters, (argv) => {
        void downloadLang(argv).catch((err) => {
          const baseLogger = makeLogger({ prefix: 'LANG' })
          baseLogger.sub('Exit').attachError(err).critical('Language Server exits after an error occured.')
          process.exit(1)
        })
      })
  })
  .help().argv
