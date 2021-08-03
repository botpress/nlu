import * as NLUEngine from '@botpress/nlu-engine'
import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { StanOptions } from './config'
import { getAppDataPath } from './utils/app-data'

const wrapLogger = (logger: Logger): NLUEngine.Logger => {
  return {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg)),
    sub: (namespace: string) => wrapLogger(logger.sub(namespace))
  }
}

export const makeEngine = async (options: StanOptions, logger: Logger) => {
  const loggerWrapper: NLUEngine.Logger = wrapLogger(logger)

  try {
    const { ducklingEnabled, ducklingURL, modelCacheSize, languageSources, legacyElection } = options
    const config: NLUEngine.Config = {
      languageSources,
      ducklingEnabled,
      ducklingURL,
      modelCacheSize,
      legacyElection,
      cachePath: getAppDataPath()
    }

    const engine = await NLUEngine.makeEngine(config, loggerWrapper)
    return engine
  } catch (err) {
    // TODO: Make lang provider throw if it can't connect.
    logger
      .attachError(err)
      .error(
        'There was an error while initializing Engine tools. Check out the connection to your language and Duckling server.'
      )
    process.exit(1)
  }
}
