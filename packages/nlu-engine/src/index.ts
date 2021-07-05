import _ from 'lodash'
import path from 'path'
import Engine from './engine'
import { DUCKLING_ENTITIES } from './engine/entities/duckling-extractor/enums'
import { isTrainingAlreadyStarted, isTrainingCanceled } from './errors'
import LanguageService from './language-service'
import _modelIdService from './model-id-service'
import { Config, Logger } from './typings'

export const SYSTEM_ENTITIES = DUCKLING_ENTITIES

export const errors: _.Dictionary<(err: Error) => boolean> = {
  isTrainingAlreadyStarted,
  isTrainingCanceled
}

export const makeEngine = async (config: Config, logger: Logger) => {
  const { ducklingEnabled, ducklingURL, languageSources, modelCacheSize, legacyElection, cachePath } = config
  const assetsPath = path.join(__dirname, '..', 'assets')
  const langConfig = { ducklingEnabled, ducklingURL, languageSources, assetsPath, cachePath }
  const engine = new Engine(logger, { cacheSize: modelCacheSize, legacyElection })
  await engine.initialize(langConfig)
  return engine
}

export const modelIdService = _modelIdService

export { LanguageService }
