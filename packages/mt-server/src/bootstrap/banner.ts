import { centerText, Logger } from '@botpress/logger'
import chalk from 'chalk'

import _ from 'lodash'

type BannerConfig = {
  title: string
  version: string
  bannerWidth: number
  logScopeLength: number
  logger: Logger
}

export const showBanner = (config: BannerConfig) => {
  const { title, version, logScopeLength, bannerWidth, logger } = config

  const versionLine = `Version ${version}`

  let buildLine: string | undefined
  if (process.env.TS_NODE_DEV) {
    buildLine = 'TS Node'
  }

  const infos = [versionLine, buildLine].filter((x) => x !== undefined)
  const border = _.repeat('=', bannerWidth)

  logger.info(`${border}
${chalk.bold(centerText(title, bannerWidth, logScopeLength))}
${chalk.gray(centerText(infos.join(' - '), bannerWidth, logScopeLength))}
${_.repeat(' ', logScopeLength)}${border}`)
}
