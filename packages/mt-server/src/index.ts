import { Logger, JSONFormatter, TextFormatter } from '@botpress/logger'
import fs from 'fs'
import { createServer, Server } from 'http'
import _ from 'lodash'
import path from 'path'

import { createAPI } from './api'
import { CommandLineOptions, getConfig, ModelTransferOptions } from './bootstrap/config'
import { logLaunchingMessage } from './bootstrap/launcher'
import { startJanitor } from './janitor'
import { requireJSON } from './require-json'
import { listenForUncaughtErrors } from './uncaught-errors'

const serverListen = (httpServer: Server, options: ModelTransferOptions): Promise<void> => {
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

const packageJsonPath = path.resolve(__dirname, '../package.json')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)

if (!packageJson) {
  throw new Error('Could not find package.json at the root of mt-server.')
}

const { version: pkgVersion } = packageJson

export const version = pkgVersion

export { ModelTransferOptions } from './bootstrap/config'
export const run = async (cliOptions: CommandLineOptions) => {
  const options = await getConfig(cliOptions)

  const formatter = options.logFormat === 'json' ? new JSONFormatter() : new TextFormatter()
  const baseLogger = new Logger('', {
    level: options.logLevel,
    filters: options.debugFilter ? { debug: options.debugFilter } : {},
    prefix: 'MT',
    formatter
  })

  const launcherLogger = baseLogger.sub('Launcher')
  launcherLogger.configure({
    level: 'info' // Launcher always display
  })

  await logLaunchingMessage({ ...options, version }, launcherLogger)

  const modelDirParent = path.dirname(options.modelDir)
  if (!fs.existsSync(modelDirParent)) {
    throw new Error(`Model directory \"${modelDirParent}\" does not exist.`)
  }
  if (!fs.existsSync(options.modelDir)) {
    await fs.promises.mkdir(options.modelDir)
  }

  startJanitor(options, baseLogger)

  const app = await createAPI(options, baseLogger)
  const httpServer = createServer(app)
  await serverListen(httpServer, options)

  const url = `http://${options.host}:${options.port}/`
  launcherLogger.info(`Model Transfer Server is ready at ${url}.`)

  listenForUncaughtErrors(baseLogger)
}
