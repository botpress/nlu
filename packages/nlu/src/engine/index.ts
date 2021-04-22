import _ from 'lodash'
import '../bootstrap'
import Engine from './engine'
import { DUCKLING_ENTITIES } from './engine/entities/duckling-extractor/enums'
import { isTrainingAlreadyStarted, isTrainingCanceled } from './errors'
import _modelIdService from './model-id-service'
import { Config, Logger } from './typings'

export * from './typings'

export const SYSTEM_ENTITIES = DUCKLING_ENTITIES

export const errors: _.Dictionary<(err: Error) => boolean> = {
  isTrainingAlreadyStarted,
  isTrainingCanceled
}

export const makeEngine = async (config: Config, logger: Logger) => {
  const { ducklingEnabled, ducklingURL, languageSources, modelCacheSize, legacyElection } = config
  const langConfig = { ducklingEnabled, ducklingURL, languageSources }
  const engine = new Engine({ cacheSize: modelCacheSize, legacyElection })
  await engine.initialize(langConfig, logger)
  return engine
}

export const modelIdService = _modelIdService
