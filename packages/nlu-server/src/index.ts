import { Logger, JSONFormatter, TextFormatter, LogLevel } from '@botpress/logger'
import { createServer, Server } from 'http'
import _ from 'lodash'
import path from 'path'

import { createAPI } from './api'
import { getConfig, validateConfig } from './bootstrap/config'
import { logLaunchingMessage } from './bootstrap/launcher'
import { makeApplication } from './bootstrap/make-application'
import { requireJSON } from './require-json'
import * as types from './typings'
import { listenForUncaughtErrors } from './uncaught-errors'

const packageJsonPath = path.resolve(__dirname, '../package.json')
const buildInfoPath = path.resolve(__dirname, '../.buildinfo.json')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)
const buildInfo = requireJSON<types.BuildInfo>(buildInfoPath)
if (!packageJson) {
  throw new Error('Could not find package.json at the root of nlu-server.')
}

const { version: pkgVersion } = packageJson

export const version = pkgVersion

const serverListen = (httpServer: Server, options: types.NLUServerOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const hostname = options.host === 'localhost' ? undefined : options.host
      httpServer.listen(options.port, hostname, undefined, () => {
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}

export const run: typeof types.run = async (cliOptions: types.CommandLineOptions) => {
  const options = await getConfig(cliOptions)
  validateConfig(options)

  const formatter = options.logFormat === 'json' ? new JSONFormatter() : new TextFormatter()
  const baseLogger = new Logger('', {
    level: options.logLevel,
    filters: options.debugFilter ? { debug: options.debugFilter } : {},
    prefix: 'NLU',
    formatter
  })

  const launcherLogger = baseLogger.sub('Launcher')
  launcherLogger.configure({
    level: 'info' // Launcher always display
  })

  await logLaunchingMessage({ ...options, version, buildInfo }, launcherLogger)

  const application = await makeApplication(options, version, baseLogger)
  const app = await createAPI(options, application, baseLogger)
  const httpServer = createServer(app)
  await serverListen(httpServer, options)

  const url = `http://${options.host}:${options.port}/`
  launcherLogger.info(`NLU Server is ready at ${url}. Make sure this URL is not publicly available.`)

  listenForUncaughtErrors(baseLogger)
}
