import _ from 'lodash'
import path from 'path'
import Engine from './engine'
import { DUCKLING_ENTITIES } from './engine/entities/duckling-extractor/enums'
import { isTrainingAlreadyStarted, isTrainingCanceled } from './errors'
import LanguageService from './language-service'
import _modelIdService from './model-id-service'
import { requireJSON } from './require-json'
import { Config, Logger } from './typings'

const rootPkgDirectory = path.resolve(__dirname, '..')
const packageJsonPath = path.resolve(rootPkgDirectory, 'package.json')
const assetsPath = path.resolve(rootPkgDirectory, 'assets')
const packageJson = requireJSON<{ version: string }>(packageJsonPath)
if (!packageJson) {
  throw new Error('Could not find package.json at the root of nlu-engine.')
}

const { version: pkgVersion } = packageJson

export const SYSTEM_ENTITIES = DUCKLING_ENTITIES

export const errors: _.Dictionary<(err: Error) => boolean> = {
  isTrainingAlreadyStarted,
  isTrainingCanceled
}

export const makeEngine = async (config: Config, logger: Logger) => {
  const { ducklingEnabled, ducklingURL, languageSources, modelCacheSize, legacyElection, cachePath } = config
  const langConfig = { ducklingEnabled, ducklingURL, languageSources, assetsPath, cachePath }
  const engine = new Engine(pkgVersion, logger, { cacheSize: modelCacheSize, legacyElection })
  await engine.initialize(langConfig)
  return engine
}

export const modelIdService = _modelIdService

export { LanguageService }
