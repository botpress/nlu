import { LanguageService, Logger as EngineLogger } from '@botpress/nlu-engine'
import { Logger, TextFormatter, JSONFormatter } from '@bpinternal/log4bot'
import chalk from 'chalk'
import _ from 'lodash'
import path from 'path'

import API, { APIOptions } from './api'
import { LangApplication } from './application'
import DownloadManager from './application/download-manager'
import { getLangServerConfig } from './config'
import { requireJSON } from './require-json'
import * as types from './typings'
import { listenForUncaughtErrors } from './uncaught-errors'

const packageJsonPath = path.resolve(__dirname, '../package.json')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)
if (!packageJson) {
  throw new Error('Could not find package.json at the root of lang-server.')
}

const { version: pkgVersion } = packageJson

export { download } from './download'
export const version = pkgVersion

const wrapLogger = (logger: Logger): EngineLogger => {
  return {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg)),
    sub: (namespace: string) => wrapLogger(logger.sub(namespace))
  }
}

const centerText = (text: string, width: number, indent: number = 0) => {
  const padding = Math.floor((width - text.length) / 2)
  return _.repeat(' ', padding + indent) + text + _.repeat(' ', padding)
}

export const run: typeof types.run = async (argv: types.LangArgv) => {
  const options = getLangServerConfig(argv)

  const formatter = options.logFormat === 'json' ? new JSONFormatter() : new TextFormatter()
  const baseLogger = new Logger('', {
    level: options.logLevel,
    filters: options.debugFilter ? { debug: options.debugFilter } : {},
    prefix: 'LANG',
    formatter
  })

  const launcherLogger = baseLogger.sub('Launcher')
  launcherLogger.configure({
    level: 'info' // Launcher always display
  })

  launcherLogger.debug('Language Server Options %o', options)

  const languageServiceLogger = baseLogger.sub('lang').sub('service')

  const langService = new LanguageService(
    options.dim,
    options.domain,
    options.langDir,
    wrapLogger(languageServiceLogger)
  )
  const downloadManager = new DownloadManager(
    options.dim,
    options.domain,
    options.langDir,
    options.metadataLocation,
    baseLogger
  )

  const apiOptions: APIOptions = {
    version,
    host: options.host,
    port: options.port,
    authToken: options.authToken,
    limit: options.limit,
    limitWindow: options.limitWindow,
    prometheusEnabled: options.prometheusEnabled,
    apmEnabled: options.apmEnabled,
    adminToken: options.adminToken || ''
  }

  const indent = 0
  const width = 75
  const border = _.repeat('=', width)
  launcherLogger.info(chalk`${border}
{bold ${centerText('Botpress Language Server', width, indent)}}
{dim ${centerText(`Version ${version}`, width, indent)}}
${_.repeat(' ', indent)}${border}`)

  if (options.authToken?.length) {
    launcherLogger.info(`authToken: ${chalk.greenBright('enabled')} (only users with this token can query your server)`)
  } else {
    launcherLogger.info(`authToken: ${chalk.redBright('disabled')} (anyone can query your language server)`)
  }

  if (options.adminToken?.length) {
    launcherLogger.info(
      `adminToken: ${chalk.greenBright('enabled')} (only users using this token can manage the server)`
    )
  } else {
    launcherLogger.info(`adminToken: ${chalk.redBright('disabled')} (anyone can add, remove or change languages)`)
  }

  if (options.limit) {
    launcherLogger.info(
      `limit: ${chalk.greenBright('enabled')} allowing ${options.limit} requests/IP address in a ${options.limitWindow
      } timeframe `
    )
  } else {
    launcherLogger.info(`limit: ${chalk.redBright('disabled')} (no protection - anyone can query without limitation)`)
  }

  if (options.offline) {
    launcherLogger.info(
      `mode: ${chalk.redBright(
        'offline'
      )} (languages need to be downloaded manually from a machine with Internet access)`
    )
  } else {
    launcherLogger.info(
      `Mode: ${chalk.greenBright('online')} (languages will be downloaded from ${options.metadataLocation})`
    )
  }

  launcherLogger.info(`Serving ${options.dim} language dimensions from ${options.langDir}`)

  const { offline, adminToken } = options
  const langApplication = new LangApplication(langService, downloadManager, {
    offline,
    version,
    adminToken
  })
  await Promise.all([API(apiOptions, baseLogger, langApplication), langApplication.initialize()])

  listenForUncaughtErrors(baseLogger)
}
