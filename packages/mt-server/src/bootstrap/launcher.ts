import { Logger } from '@botpress/logger'
import chalk from 'chalk'
import _ from 'lodash'
import ms from 'ms'
import { showBanner } from './banner'
import { ModelTransferOptions } from './config'

type LaunchingInfo = {
  version: string
}

export const logLaunchingMessage = async (info: ModelTransferOptions & LaunchingInfo, launcherLogger: Logger) => {
  showBanner({
    title: 'Botpress Model Transfer',
    version: info.version,
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

  launcherLogger.info(`models stored at "${info.modelDir}"`)

  const stringTTL = _.isString(info.modelTTL) ? info.modelTTL : ms(info.modelTTL)
  launcherLogger.info(`models ttl ${stringTTL}`)

  if (info.bodySize) {
    launcherLogger.info(`body size: allowing HTTP requests body of size ${info.bodySize}`)
  }
}
