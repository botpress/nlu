import { LoggerLevel, makeLogger } from '@botpress/logger'
import Bluebird from 'bluebird'
import { createServer } from 'http'
import _ from 'lodash'
import path from 'path'

import { createAPI } from './api'
import { CommandLineOptions, getConfig, validateConfig } from './bootstrap/config'
import { logLaunchingMessage } from './bootstrap/launcher'
import { makeApplication } from './bootstrap/make-application'
import { buildWatcher } from './bootstrap/watcher'
import { requireJSON } from './require-json'
import * as types from './typings'

const packageJsonPath = path.resolve(__dirname, '../package.json')
const buildInfoPath = path.resolve(__dirname, '../.buildinfo.json')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)
const buildInfo = requireJSON<types.BuildInfo>(buildInfoPath)
if (!packageJson) {
  throw new Error('Could not find package.json at the root of nlu-server.')
}

const { version } = packageJson

export const run: typeof types.run = async (cliOptions: CommandLineOptions) => {
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

  const launchingMessageInfo = { ...options, version, buildInfo, configSource, configFile: cliOptions.config }
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
  launcherLogger.info(`NLU Server is ready at ${url}. Make sure this URL is not publicly available.`)
}
