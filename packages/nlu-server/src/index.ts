import { LoggerLevel, makeLogger } from '@botpress/logger'
import Bluebird from 'bluebird'
import { createServer } from 'http'
import _ from 'lodash'

// @ts-ignore
import { version } from '../package.json'

import { createAPI } from './api'
import { CommandLineOptions, getConfig, validateConfig } from './bootstrap/config'
import { logLaunchingMessage } from './bootstrap/launcher'
import { makeApplication } from './bootstrap/make-application'
import { buildWatcher } from './bootstrap/watcher'
import * as sdk from './typings'

export const run: typeof sdk.run = async (cliOptions: CommandLineOptions) => {
  const { options, source: configSource } = await getConfig(cliOptions)
  validateConfig(options)

  const baseLogger = makeLogger({
    level: Number(options.verbose) !== NaN ? Number(options.verbose) : LoggerLevel.Info,
    minLevel: LoggerLevel.Error,
    filters: options.logFilter
  })

  const launcherLogger = baseLogger.sub('Launcher')
  launcherLogger.configure({
    minLevel: LoggerLevel.Info // Launcher always display
  })

  const watcher = buildWatcher()

  const launchingMessageInfo = { ...options, version, configSource, configFile: cliOptions.config }
  await logLaunchingMessage(launchingMessageInfo, launcherLogger)

  const application = await makeApplication(options, version, baseLogger, watcher)
  const app = await createAPI(options, application, baseLogger)
  const httpServer = createServer(app)

  await Bluebird.fromCallback((callback) => {
    const hostname = options.host === 'localhost' ? undefined : options.host
    httpServer.listen(options.port, hostname, undefined, () => {
      callback(null)
    })
  })

  const url = `http://${options.host}:${options.port}/`
  launcherLogger.info(`NLU Server is ready at ${url}`)
  launcherLogger.warn(`Make sure the URL ${url} is not publicly available`)
}
