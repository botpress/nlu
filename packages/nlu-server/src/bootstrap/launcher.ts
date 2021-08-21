import { centerText, Logger } from '@botpress/logger'
import chalk from 'chalk'
import _ from 'lodash'
import ms from 'ms'
import { ConfigSource, NLUServerOptions } from './config'
import { displayDocumentation } from './documentation'

interface LaunchingInfo {
  version: string
  configSource: ConfigSource
  configFile?: string
}

export const logLaunchingMessage = async (info: NLUServerOptions & LaunchingInfo, launcherLogger: Logger) => {
  launcherLogger.info(chalk`========================================
      {bold ${centerText('Botpress Standalone NLU', 40, 9)}}
      {dim ${centerText(`Version ${info.version}`, 40, 9)}}
${_.repeat(' ', 9)}========================================`)

  if (info.configSource === 'environment') {
    launcherLogger.info('Loading config from environment variables')
  } else if (info.configSource === 'file') {
    launcherLogger.info(`Loading config from file "${info.configFile}"`)
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

  if (info.doc) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await sleep(ms('1s'))
    displayDocumentation(launcherLogger, info)
  }
}
