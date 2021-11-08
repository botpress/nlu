import path from 'path'
import { LangServerSpecs } from 'src/typings'
import yn from 'yn'

import MLToolkit from '../ml/toolkit'
import { LanguageConfig, Logger } from '../typings'
import { DucklingEntityExtractor } from './entities/duckling-extractor'
import { DummySystemEntityExtractor } from './entities/dummy-system-extractor'
import { SystemEntityCacheManager } from './entities/entity-cache-manager'
import { MicrosoftEntityExtractor } from './entities/microsoft-extractor'
import languageIdentifier, { FastTextLanguageId } from './language/language-identifier'
import { LanguageProvider } from './language/language-provider'
import { getPOSTagger, tagSentence } from './language/pos-tagger'
import { nonSpaceSeparatedLanguages } from './language/space-separated'
import { getStopWordsForLang } from './language/stopWords'
import SeededLodashProvider from './tools/seeded-lodash'
import { SystemEntityExtractor, Tools } from './typings'

const PRE_TRAINED_DIR = 'pre-trained'
const STOP_WORDS_DIR = 'stop-words'
const LANG_ID_MODEL = 'lid.176.ftz'

const MICROSOFT_CACHE_FILE = 'microsoft_sys_entities.json'
const DUCKLING_CACHE_FILE = 'duckling_sys_entities.json'

const versionGetter = (languageProvider: LanguageProvider) => (): LangServerSpecs => {
  const { langServerInfo } = languageProvider
  const { dim, domain, version } = langServerInfo
  return {
    dimensions: dim,
    domain,
    version
  }
}

const initializeLanguageProvider = async (config: LanguageConfig, logger: Logger): Promise<LanguageProvider> => {
  const { languageURL, languageAuthToken, cachePath } = config
  const langProviderCachePath = path.join(cachePath, 'cache')
  return LanguageProvider.create(logger, {
    languageURL,
    languageAuthToken,
    cacheDir: langProviderCachePath
  })
}

const makeSystemEntityExtractor = async (config: LanguageConfig, logger: Logger): Promise<SystemEntityExtractor> => {
  const makeCacheManager = (cacheFileName: string) =>
    new SystemEntityCacheManager(path.join(config.cachePath, 'cache', cacheFileName), true, logger)

  if (yn(process.env.BP_MICROSOFT_RECOGNIZER)) {
    logger.warning(
      'You are using Microsoft Recognizer entity extractor which is experimental. This feature can disappear at any time.'
    )
    const msCache = makeCacheManager(MICROSOFT_CACHE_FILE)
    const extractor = new MicrosoftEntityExtractor(msCache, logger)
    await extractor.configure()
    return extractor
  }

  if (config.ducklingEnabled) {
    const duckCache = makeCacheManager(DUCKLING_CACHE_FILE)
    const extractor = new DucklingEntityExtractor(duckCache, config.ducklingURL)
    await extractor.init()
    return extractor
  }

  logger.warning('Duckling is disabled. No system entities available.')
  return new DummySystemEntityExtractor()
}

const isSpaceSeparated = (lang: string) => {
  return !nonSpaceSeparatedLanguages.includes(lang)
}

export async function initializeTools(config: LanguageConfig & { assetsPath: string }, logger: Logger): Promise<Tools> {
  const languageProvider = await initializeLanguageProvider(config, logger)

  const fastTextLanguageIdModelPath = path.resolve(config.assetsPath, PRE_TRAINED_DIR, LANG_ID_MODEL)
  const fastTextLanguageId = new FastTextLanguageId(MLToolkit)
  await fastTextLanguageId.initializeModel(fastTextLanguageIdModelPath)

  const stopWordsDirPath = path.resolve(config.assetsPath, STOP_WORDS_DIR)

  const posModelDirPath = path.resolve(config.assetsPath, PRE_TRAINED_DIR)

  return {
    identify_language: languageIdentifier(fastTextLanguageId),

    pos_utterances: async (tokenUtterances: string[][], lang: string) => {
      const tagger = await getPOSTagger(posModelDirPath, lang, MLToolkit)
      return tokenUtterances.map((u) => tagSentence(tagger, u))
    },
    tokenize_utterances: (utterances: string[], lang: string, vocab?: string[]) =>
      languageProvider.tokenize(utterances, lang, vocab),
    vectorize_tokens: async (tokens, lang) => {
      const a = await languageProvider.vectorize(tokens, lang)
      return a.map((x) => Array.from(x.values()))
    },
    getStopWordsForLang: getStopWordsForLang(stopWordsDirPath),
    isSpaceSeparated,

    getLanguages: () => languageProvider.languages,
    getLangServerSpecs: versionGetter(languageProvider),
    seededLodashProvider: new SeededLodashProvider(),
    mlToolkit: MLToolkit,
    systemEntityExtractor: await makeSystemEntityExtractor(config, logger)
  }
}
