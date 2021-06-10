// eslint-disable-next-line import/order
import _ from 'lodash'
import * as NLUEngine from '../engine'
import { Logger as ILogger } from '../utils/typings'
import { StanOptions } from './config'

export const makeEngine = async (options: StanOptions, logger: ILogger) => {
  const loggerWrapper: NLUEngine.Logger = {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg))
  }

  try {
    const { ducklingEnabled, ducklingURL, modelCacheSize, languageSources, legacyElection } = options
    const config: NLUEngine.Config = {
      languageSources,
      ducklingEnabled,
      ducklingURL,
      modelCacheSize,
      legacyElection
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
