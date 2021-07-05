import path from 'path'
import { Health, Specifications } from 'src/typings'
import yn from 'yn'

// eslint-disable-next-line import/order
const { version: nluVersion } = require('../../package.json')

import MLToolkit from '../ml/toolkit'
import { LanguageConfig, Logger } from '../typings'
import { DucklingEntityExtractor } from './entities/duckling-extractor'
import { SystemEntityCacheManager } from './entities/entity-cache-manager'
import { MicrosoftEntityExtractor } from './entities/microsoft-extractor'
import languageIdentifier, { FastTextLanguageId } from './language/language-identifier'
import LangProvider from './language/language-provider'
import { getPOSTagger, tagSentence } from './language/pos-tagger'
import { getStopWordsForLang } from './language/stopWords'
import SeededLodashProvider from './tools/seeded-lodash'
import { LanguageProvider, SystemEntityExtractor, Tools } from './typings'

const PRE_TRAINED_DIR = 'pre-trained'
const STOP_WORDS_DIR = 'stop-words'
const LANG_ID_MODEL = 'lid.176.ftz'

const healthGetter = (languageProvider: LanguageProvider) => (): Health => {
  const { validProvidersCount, validLanguages } = languageProvider.getHealth()
  return {
    isEnabled: validProvidersCount! > 0 && validLanguages!.length > 0,
    validProvidersCount: validProvidersCount!,
    validLanguages: validLanguages!
  }
}

const versionGetter = (languageProvider: LanguageProvider) => (): Specifications => {
  const { langServerInfo } = languageProvider
  const { dim, domain, version } = langServerInfo

  return {
    nluVersion,
    languageServer: {
      dimensions: dim,
      domain,
      version
    }
  }
}

const initializeLanguageProvider = async (
  config: LanguageConfig,
  logger: Logger,
  seededLodashProvider: SeededLodashProvider
) => {
  try {
    const languageProvider = await LangProvider.initialize(
      config.languageSources,
      logger,
      nluVersion,
      path.join(config.cachePath, 'cache'),
      seededLodashProvider
    )
    const getHealth = healthGetter(languageProvider)
    return { languageProvider, health: getHealth() }
  } catch (e) {
    if (e.failure && e.failure.code === 'ECONNREFUSED') {
      const errMsg = `Language server can't be reached at address ${e.failure.address}:${e.failure.port}`
      logger.error(errMsg)
      throw new Error(errMsg)
    }
    throw e
  }
}

const makeSystemEntityExtractor = async (config: LanguageConfig, logger: Logger): Promise<SystemEntityExtractor> => {
  const makeCacheManager = (cacheFileName: string) =>
    new SystemEntityCacheManager(path.join(config.cachePath, 'cache', cacheFileName), true, logger)

  if (yn(process.env.BP_MICROSOFT_RECOGNIZER)) {
    logger.warning(
      'You are using Microsoft Recognizer entity extractor which is experimental. This feature can disappear at any time.'
    )
    const msCache = makeCacheManager('microsoft_sys_entities.json')
    const extractor = new MicrosoftEntityExtractor(msCache, logger)
    await extractor.configure()
    return extractor
  }

  const duckCache = makeCacheManager('duckling_sys_entities.json')
  const extractor = new DucklingEntityExtractor(duckCache, logger)
  await extractor.configure(config.ducklingEnabled, config.ducklingURL)
  return extractor
}

export async function initializeTools(config: LanguageConfig & { assetsPath: string }, logger: Logger): Promise<Tools> {
  const seededLodashProvider = new SeededLodashProvider()
  const { languageProvider } = await initializeLanguageProvider(config, logger, seededLodashProvider)

  const fastTextLanguageId = new FastTextLanguageId(MLToolkit)
  await fastTextLanguageId.initializeModel(path.resolve(config.assetsPath, PRE_TRAINED_DIR, LANG_ID_MODEL))
  const languageId = languageIdentifier(fastTextLanguageId)

  return {
    identify_language: languageId,

    partOfSpeechUtterances: async (tokenUtterances: string[][], lang: string) => {
      const tagger = await getPOSTagger(path.resolve(config.assetsPath, PRE_TRAINED_DIR), lang, MLToolkit)
      return tokenUtterances.map((u) => tagSentence(tagger, u))
    },
    tokenize_utterances: (utterances: string[], lang: string, vocab?: string[]) =>
      languageProvider.tokenize(utterances, lang, vocab),
    vectorize_tokens: async (tokens, lang) => {
      const a = await languageProvider.vectorize(tokens, lang)
      return a.map((x) => Array.from(x.values()))
    },
    generateSimilarJunkWords: (vocab: string[], lang: string) => languageProvider.generateSimilarJunkWords(vocab, lang),
    getStopWordsForLang: getStopWordsForLang(path.resolve(config.assetsPath, STOP_WORDS_DIR)),

    getHealth: healthGetter(languageProvider),
    getLanguages: () => languageProvider.languages,
    getSpecifications: versionGetter(languageProvider),
    seededLodashProvider,
    mlToolkit: MLToolkit,
    systemEntityExtractor: await makeSystemEntityExtractor(config, logger)
  }
}
