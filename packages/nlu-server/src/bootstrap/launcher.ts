import { Logger } from '@botpress/logger'
import chalk from 'chalk'
import _ from 'lodash'
import ms from 'ms'
import { BuildInfo, NLUServerOptions } from '../typings'
import { showBanner } from './banner'
import { displayDocumentation } from './documentation'

type LaunchingInfo = {
  version: string
  buildInfo?: BuildInfo
}

export const logLaunchingMessage = async (info: NLUServerOptions & LaunchingInfo, launcherLogger: Logger) => {
  showBanner({
    title: 'Botpress Standalone NLU',
    version: info.version,
    buildInfo: info.buildInfo,
    logScopeLength: 9,
    bannerWidth: 75,
    logger: launcherLogger
  })

  if (info.limit) {
    launcherLogger.info(
      `limit: ${chalk.greenBright('enabled')} allowing ${info.limit} requests/IP address in a ${
        info.limitWindow
      } timeframe `
    )
  } else {
    launcherLogger.info(`limit: ${chalk.redBright('disabled')} (no protection - anyone can query without limitation)`)
  }

  if (info.ducklingEnabled) {
    launcherLogger.info(`duckling: ${chalk.greenBright('enabled')} url=${info.ducklingURL}`)
  } else {
    launcherLogger.info(`duckling: ${chalk.redBright('disabled')}`)
  }
  launcherLogger.info(`lang server: url=${info.languageURL}`)

  launcherLogger.info(`body size: allowing HTTP requests body of size ${info.bodySize}`)

  if (info.dbURL) {
    launcherLogger.info('models stored in the database')
  } else {
    launcherLogger.info(`models stored at "${info.modelDir}"`)
  }

  if (info.batchSize > 0) {
    launcherLogger.info(`batch size: allowing up to ${info.batchSize} predictions in one call to POST /predict`)
  }

  if (info.doc) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await sleep(ms('1s'))
    displayDocumentation(launcherLogger, info)
  }
}
