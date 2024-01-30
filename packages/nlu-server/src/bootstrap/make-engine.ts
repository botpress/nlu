import * as NLUEngine from '@botpress/nlu-engine'
import { Logger } from '@bpinternal/log4bot'
import _ from 'lodash'
import { getAppDataPath } from '../app-data'
import { NLUServerOptions } from '../typings'

const wrapLogger = (logger: Logger): NLUEngine.Logger => {
  return {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg)),
    sub: (namespace: string) => wrapLogger(logger.sub(namespace))
  }
}

export const makeEngine = async (options: NLUServerOptions, logger: Logger) => {
  const loggerWrapper: NLUEngine.Logger = wrapLogger(logger)

  const { ducklingEnabled, ducklingURL, modelCacheSize, languageURL, languageAuthToken } = options
  const config: NLUEngine.Config = {
    languageURL,
    languageAuthToken,
    ducklingEnabled,
    ducklingURL,
    modelCacheSize,
    cachePath: getAppDataPath()
  }

  return NLUEngine.makeEngine(config, loggerWrapper)
}
