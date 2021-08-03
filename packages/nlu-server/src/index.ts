import { centerText, LoggerLevel, makeLogger } from '@botpress/logger'
import Bluebird from 'bluebird'
import bytes from 'bytes'
import chalk from 'chalk'
import { createServer } from 'http'
import _ from 'lodash'
import { createApp } from './app'
import { CommandLineOptions, getConfig } from './config'
import { displayDocumentation } from './documentation'
import { makeEngine } from './make-engine'
import { buildWatcher } from './watcher'

export const run = async (cliOptions: CommandLineOptions, version: string) => {
  const { options, source: configSource } = await getConfig(cliOptions)

  const baseLogger = makeLogger({
    level: Number(options.verbose) !== NaN ? Number(options.verbose) : LoggerLevel.Info,
    filters: options.logFilter
  })

  const launcherLogger = baseLogger.sub('Launcher')
  launcherLogger.configure({
    minLevel: LoggerLevel.Info // Launcher always display
  })

  if (!bytes(options.bodySize)) {
    throw new Error(`Specified body-size "${options.bodySize}" has an invalid format.`)
  }

  launcherLogger.debug('NLU Server Options %o', options)

  const engine = await makeEngine(options, launcherLogger)

  launcherLogger.info(chalk`========================================
      {bold ${centerText('Botpress Standalone NLU', 40, 9)}}
      {dim ${centerText(`Version ${version}`, 40, 9)}}
${_.repeat(' ', 9)}========================================`)

  if (configSource === 'environment') {
    launcherLogger.info('Loading config from environment variables')
  } else if (configSource === 'file') {
    launcherLogger.info(`Loading config from file "${cliOptions.config}"`)
  }

  if (options.authToken?.length) {
    launcherLogger.info(`authToken: ${chalk.greenBright('enabled')} (only users with this token can query your server)`)
  } else {
    launcherLogger.info(`authToken: ${chalk.redBright('disabled')} (anyone can query your nlu server)`)
  }

  if (options.limit) {
    launcherLogger.info(
      `limit: ${chalk.greenBright('enabled')} allowing ${options.limit} requests/IP address in a ${
        options.limitWindow
      } timeframe `
    )
  } else {
    launcherLogger.info(`limit: ${chalk.redBright('disabled')} (no protection - anyone can query without limitation)`)
  }

  if (options.ducklingEnabled) {
    launcherLogger.info(`duckling: ${chalk.greenBright('enabled')} url=${options.ducklingURL}`)
  } else {
    launcherLogger.info(`duckling: ${chalk.redBright('disabled')}`)
  }
  for (const langSource of options.languageSources) {
    launcherLogger.info(`lang server: url=${langSource.endpoint}`)
  }

  launcherLogger.info(`body size: allowing HTTP requests body of size ${options.bodySize}`)

  if (options.dbURL) {
    launcherLogger.info('models stored in the database')
  } else {
    launcherLogger.info(`models stored at "${options.modelDir}"`)
  }

  if (options.batchSize > 0) {
    launcherLogger.info(`batch size: allowing up to ${options.batchSize} predictions in one call to POST /predict`)
  }

  options.doc && displayDocumentation(launcherLogger, options)

  const watcher = buildWatcher()

  const app = await createApp(options, engine, version, watcher, baseLogger)
  const httpServer = createServer(app)

  await Bluebird.fromCallback((callback) => {
    const hostname = options.host === 'localhost' ? undefined : options.host
    httpServer.listen(options.port, hostname, undefined, () => {
      callback(null)
    })
  })

  launcherLogger.info(`NLU Server is ready at http://${options.host}:${options.port}/`)
}
