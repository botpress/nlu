import { centerText, Logger } from '@botpress/logger'
import chalk from 'chalk'

import _ from 'lodash'
import moment from 'moment'

interface BannerConfig {
  title: string
  version: string
  /** Length of the logger label */
  labelLength: number
  /** Length of the complete line */
  lineWidth: number
  logger: Logger
}

interface BuildMetadata {
  version: string
  date: number
  branch: string
}

export const showBanner = (config: BannerConfig) => {
  const { title, version, labelLength, lineWidth, logger } = config
  let buildMetadata

  try {
    const metadata: BuildMetadata = require('../metadata.json')
    const builtFrom = process.pkg ? 'BIN' : 'SRC'
    const branchInfo = metadata.branch !== 'master' ? `/${metadata.branch}` : ''

    buildMetadata = `Build ${moment(metadata.date).format('YYYYMMDD-HHmm')}_${builtFrom}${branchInfo}`
  } catch (err) {}

  const infos = [`Version ${version}`, buildMetadata].filter((x) => x !== undefined)
  const border = _.repeat('=', lineWidth)

  logger.info(`${border}
${chalk.bold(centerText(title, lineWidth, labelLength))}
${chalk.gray(centerText(infos.join(' - '), lineWidth, labelLength))}
${_.repeat(' ', labelLength)}${border}`)
}
