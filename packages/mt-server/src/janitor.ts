import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import fs from 'fs/promises'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import path from 'path'

type Options = {
  modelDir: string
  modelTTL: number | string
}

export const startJanitor = (options: Options, baseLogger: Logger) => {
  const { modelDir, modelTTL } = options
  const janitorLogger = baseLogger.sub('janitor')
  const msTTL = _.isNumber(modelTTL) ? modelTTL : ms(modelTTL)
  const janitorInterval = msTTL / 2
  const taskId = setInterval(_runJanitor(modelDir, msTTL, janitorLogger), janitorInterval)
  return () => clearInterval(taskId)
}

const _runJanitor = (modelDir: string, ttl: number, logger: Logger) => async () => {
  const models = await fs.readdir(modelDir)
  const modelPaths = models.map((m) => path.join(modelDir, m))

  const threshold = moment().subtract(ttl, 'ms')

  const modelToPrune = await Bluebird.filter(modelPaths, _isOlderThan(threshold))
  if (!modelToPrune.length) {
    return
  }

  logger.debug(`Janitor about to prune ${modelToPrune.length} models`)
  return Bluebird.each(modelToPrune, fs.unlink)
}

const _isOlderThan = (threshold: moment.Moment) => async (filePath: string) => {
  const stats = await fs.stat(filePath)
  if (moment(stats.ctime).isBefore(threshold)) {
    return true
  }
  return false
}
