import { Logger } from '@botpress/logger'
import chalk from 'chalk'
import _ from 'lodash'
import { showBanner } from '../utils/banner'
import { ConfigSource, NLUServerOptions } from './config'
import { displayDocumentation } from './documentation'

interface LaunchingInfo {
  version: string
  configSource: ConfigSource
  configFile?: string
}

export const logLaunchingMessage = (info: NLUServerOptions & LaunchingInfo, launcherLogger: Logger) => {
  launcherLogger.debug('NLU Server Options %o', info)

  showBanner({
    title: 'Botpress Standalone NLU',
    version: info.version,
    labelLength: 9,
    lineWidth: 75,
    logger: launcherLogger
  })

  if (info.configSource === 'environment') {
    launcherLogger.info('Loading config from environment variables')
  } else if (info.configSource === 'file') {
    launcherLogger.info(`Loading config from file "${info.configFile}"`)
  }

  if (info.authToken?.length) {
    launcherLogger.info(`authToken: ${chalk.greenBright('enabled')} (only users with this token can query your server)`)
  } else {
    launcherLogger.info(`authToken: ${chalk.redBright('disabled')} (anyone can query your nlu server)`)
  }

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
  for (const langSource of info.languageSources) {
    launcherLogger.info(`lang server: url=${langSource.endpoint}`)
  }

  launcherLogger.info(`body size: allowing HTTP requests body of size ${info.bodySize}`)

  if (info.dbURL) {
    launcherLogger.info('models stored in the database')
  } else {
    launcherLogger.info(`models stored at "${info.modelDir}"`)
  }

  if (info.batchSize > 0) {
    launcherLogger.info(`batch size: allowing up to ${info.batchSize} predictions in one call to POST /predict`)
  }

  info.doc && displayDocumentation(launcherLogger, info)
}
