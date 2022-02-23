import _ from 'lodash'
import * as MLToolkit from '../../ml/toolkit'
import { POSClass, POS_CLASSES } from '../language/pos-tagger'
import { nonSpaceSeparatedLanguages } from '../language/space-separated'
import { SPACE, splitSpaceToken } from '../tools/token-utils'
import { SystemEntityExtractor, Tools } from '../typings'

import { fakeKmeans } from './fake-kmeans'
import { FakeSvm } from './fake-svm'

/**
 * Basically mimics the language server tokenizer. Use this function for testing purposes
 * @param text text you want to tokenize
 */
export function tokenizeLatinTextForTests(text: string): string[] {
  return splitSpaceToken(text.replace(/\s/g, SPACE))
}

/**
 * Returns a random vector for token
 * @param token the token you want to vectorize
 */
export function randomlyVectorize(token: string, dim: number): number[] {
  const max_n = dim * 2
  return _.sampleSize(_.range(max_n), dim)
}

/**
 * Returns a random POS tag for tokens
 * @param tokens the tokens you want to POS tag
 */
export function randomlyPOSTag(tokens: string[]): POSClass[] {
  return tokens.map((t) => _.sample(POS_CLASSES)!)
}

export const makeFakeTools = (dim: number, languages: string[]): Tools => {
  const tokenize_utterances = async (utterances: string[], languageCode: string, vocab?: string[]) => {
    return utterances.map((u) => tokenizeLatinTextForTests(u))
  }

  const vectorize_tokens = async (tokens: string[], languageCode: string) => {
    return tokens.map((t) => randomlyVectorize(t, dim))
  }

  const pos_utterances = async (utterances: string[][], languageCode: string) => {
    return utterances.map(randomlyPOSTag)
  }

  const getStopWordsForLang = async (languageCode: string) => {
    return ['the', 'this']
  }

  const getLanguages = () => [...languages]

  const getLangServerSpecs = () => {
    return {
      dimensions: dim,
      domain: 'domain',
      version: '1.0.0'
    }
  }

  const isSpaceSeparated = (lang: string) => {
    return !nonSpaceSeparatedLanguages.includes(lang)
  }

  const fakeSeededLodash = {
    setSeed: (seed: number) => {},
    getSeededLodash: () => _,
    resetSeed: () => {}
  }

  const fakeSystemEntityExtractor: SystemEntityExtractor = {
    extractMultiple: async (input: string[], lang: string, progress: (p: number) => void, useCache?: Boolean) => [],
    extract: async (input: string, lang: string) => []
  }

  const fakeMlToolkit: Partial<typeof MLToolkit> = {
    SVM: { Classifier: FakeSvm },
    KMeans: fakeKmeans
  }

  return {
    identify_language: async (utt: string) => 'en',
    tokenize_utterances,
    vectorize_tokens,
    pos_utterances,
    getStopWordsForLang,
    getLanguages,
    getLangServerSpecs,
    isSpaceSeparated,
    seededLodashProvider: fakeSeededLodash,
    systemEntityExtractor: fakeSystemEntityExtractor,
    mlToolkit: fakeMlToolkit as typeof MLToolkit
  }
}
