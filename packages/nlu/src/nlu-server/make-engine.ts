import * as NLUEngine from '@botpress/nlu-engine'
import _ from 'lodash'
import { ILogger } from '../utils/logger/typings'
import { wrapLogger } from '../utils/logger/wrap'
import { StanOptions } from './config'

export const makeEngine = async (options: StanOptions, logger: ILogger) => {
  const loggerWrapper: NLUEngine.Logger = wrapLogger(logger)

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
