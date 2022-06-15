import { Logger } from '@bpinternal/log4bot'
import chalk from 'chalk'

import _ from 'lodash'
import moment from 'moment'

type BuildMetadata = {
  date: number
  branch: string
}

type BannerConfig = {
  title: string
  version: string
  buildInfo?: BuildMetadata
  bannerWidth: number
  logScopeLength: number
  logger: Logger
}

const centerText = (text: string, width: number, indent: number = 0) => {
  const padding = Math.floor((width - text.length) / 2)
  return _.repeat(' ', padding + indent) + text + _.repeat(' ', padding)
}

export const showBanner = (config: BannerConfig) => {
  const { title, version, buildInfo, logScopeLength, bannerWidth, logger } = config

  const versionLine = `Version ${version}`

  let buildLine: string | undefined
  if (process.env.TS_NODE_DEV) {
    buildLine = 'TS Node'
  } else if (buildInfo) {
    const builtFrom = process.pkg ? 'BIN' : 'SRC'
    const branchInfo = buildInfo.branch !== 'master' ? `/${buildInfo.branch}` : ''
    buildLine = `Build ${moment(buildInfo.date).format('YYYYMMDD-HHmm')}_${builtFrom}${branchInfo}`
  }

  const infos = [versionLine, buildLine].filter((x) => x !== undefined)
  const border = _.repeat('=', bannerWidth)

  logger.info(`${border}
${chalk.bold(centerText(title, bannerWidth, logScopeLength))}
${chalk.gray(centerText(infos.join(' - '), bannerWidth, logScopeLength))}
${_.repeat(' ', logScopeLength)}${border}`)
}
