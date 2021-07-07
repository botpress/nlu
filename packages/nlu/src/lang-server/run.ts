import { LanguageService } from '@botpress/nlu-engine'
import chalk from 'chalk'
import _ from 'lodash'
import path from 'path'

import Logger, { centerText } from '../utils/logger'
import { LoggerLevel } from '../utils/logger/typings'
import { wrapLogger } from '../utils/logger/wrap'
import API, { APIOptions } from './api'
import DownloadManager from './service/download-manager'

export interface ArgV {
  port: number
  host: string
  limit: number
  limitWindow: string
  langDir?: string
  authToken?: string
  adminToken?: string
  metadataLocation: string
  offline: boolean
  dim: number
  domain: string
  verbose: number
  logFilter: string[] | undefined
}

export default async function (options: ArgV) {
  Logger.configure({
    level: Number(options.verbose) !== NaN ? Number(options.verbose) : LoggerLevel.Info,
    filters: options.logFilter
  })

  options.langDir = options.langDir || path.join(process.APP_DATA_PATH, 'embeddings')

  const launcherLogger = Logger.sub('Launcher')
  // Launcher always display
  launcherLogger.configure({
    level: LoggerLevel.Info,
    filters: undefined
  })

  launcherLogger.debug('Language Server Options %o', options)

  const languageServiceLogger = Logger.sub('lang').sub('service')

  const langService = new LanguageService(
    options.dim,
    options.domain,
    options.langDir,
    wrapLogger(languageServiceLogger)
  )
  const downloadManager = new DownloadManager(options.dim, options.domain, options.langDir, options.metadataLocation)

  const version = '1.1.0' // TODO: declare this elsewhere

  const apiOptions: APIOptions = {
    version,
    host: options.host,
    port: options.port,
    authToken: options.authToken,
    limit: options.limit,
    limitWindow: options.limitWindow,
    adminToken: options.adminToken || ''
  }

  launcherLogger.info(chalk`========================================
{bold ${centerText('Botpress Language Server', 40, 9)}}
{dim ${centerText(`Version ${version}`, 40, 9)}}
${_.repeat(' ', 9)}========================================`)

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
      `limit: ${chalk.greenBright('enabled')} allowing ${options.limit} requests/IP address in a ${
        options.limitWindow
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

  if (options.offline) {
    await Promise.all([API(apiOptions, langService), langService.initialize()])
  } else {
    await Promise.all([
      API(apiOptions, langService, downloadManager),
      downloadManager.initialize(),
      langService.initialize()
    ])
  }
}
