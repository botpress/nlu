import retry from 'bluebird-retry'
import crypto from 'crypto'
import fse from 'fs-extra'
import _, { debounce, sumBy } from 'lodash'
import lru from 'lru-cache'
import ms from 'ms'
import path from 'path'
import semver from 'semver'

import { Logger as ILogger } from '../../typings'
import { isSpace, processUtteranceTokens, restoreOriginalUtteranceCasing } from '../tools/token-utils'
import { LangServerInfo } from '../typings'
import { LanguageClient } from './lang-client'
import { LegacyLanguageClient } from './legacy-lang-client'

const MAX_PAYLOAD_SIZE = 150 * 1024 // 150kb
const VECTOR_FILE_PREFIX = 'lang_vectors'
const TOKEN_FILE_PREFIX = 'utterance_tokens'

const DISCOVERY_RETRY_POLICY: retry.Options = {
  interval: 1000,
  max_interval: 5000,
  timeout: 2000,
  max_tries: 5
}

export type LangProviderArgs = {
  languageURL: string
  languageAuthToken?: string
  cacheDir: string
}

export class LanguageProvider {
  private _vectorsCache: lru<string, Float32Array>
  private _tokensCache: lru<string, string[]>
  private _cacheDumpDisabled: boolean = false
  private _cacheFormatVersion: string = '1.0.0' // increment when changing cache file format to invalidate old cache files

  public static async create(logger: ILogger, args: LangProviderArgs): Promise<LanguageProvider> {
    const { languageURL, languageAuthToken, cacheDir } = args

    const legacyClient = new LegacyLanguageClient(languageURL, languageAuthToken)

    let installedLanguages: string[] | undefined
    let langServerInfo: LangServerInfo | undefined

    let langClient: LanguageClient | LegacyLanguageClient | undefined
    await retry<void>(async () => {
      const info = await legacyClient.getInfo()
      if (!info.ready) {
        throw new Error('Language server is not ready.')
      }

      // TODO: remove all these checks ASAP
      if (!info.version || !_.isString(info.version)) {
        throw new Error('Expected route GET <lang-server>/info to return object with string version')
      } else if (!semver.valid(info.version) || semver.lt(info.version, '1.2.0')) {
        logger.warning(
          'The language server provided uses a deprecated API. Please update the language server to the latest version.'
        )
        langClient = legacyClient
      } else {
        langClient = new LanguageClient(languageURL, languageAuthToken)
      }

      const langState = await langClient.getLanguages()
      const { installed } = langState
      installedLanguages = installed.map((x) => x.code)
      langServerInfo = {
        version: info.version,
        dim: info.dimentions,
        domain: info.domain
      }
    }, DISCOVERY_RETRY_POLICY)

    if (!langClient || !installedLanguages || !langServerInfo) {
      throw new Error('Language Server initialization failed')
    }

    const provider = new LanguageProvider(langClient, logger, langServerInfo, installedLanguages, cacheDir)
    await provider._clearOldCacheFiles()
    await provider._restoreVectorsCache()
    await provider._restoreTokensCache()
    return provider
  }

  private constructor(
    private _langClient: LanguageClient | LegacyLanguageClient,
    private _logger: ILogger,
    private _langServerInfo: LangServerInfo,
    private _installedLanguages: string[],
    private _cacheDir: string
  ) {
    this._vectorsCache = this._makeVectorCache()
    this._tokensCache = this._makeTokenCache()
  }

  public get languages(): string[] {
    return [...this._installedLanguages]
  }

  public get langServerInfo(): LangServerInfo {
    return this._langServerInfo
  }

  public async vectorize(tokens: string[], lang: string): Promise<Float32Array[]> {
    if (!tokens.length) {
      return []
    }

    const vectors: Float32Array[] = Array(tokens.length)
    const idxToFetch: number[] = [] // the tokens we need to fetch remotely
    const getCacheKey = (t: string) => `${lang}_${this._hash(t)}`

    tokens.forEach((token, i) => {
      if (isSpace(token)) {
        vectors[i] = new Float32Array(this._langServerInfo.dim) // float 32 Arrays are initialized with 0s
      } else if (this._vectorsCache.has(getCacheKey(token))) {
        vectors[i] = this._vectorsCache.get(getCacheKey(token))!
      } else {
        idxToFetch.push(i)
      }
    })

    while (idxToFetch.length) {
      // we tokenize maximum 100 tokens at the same time
      const group = idxToFetch.splice(0, 100)

      // We have new tokens we haven't cached yet
      const query = group.map((idx) => tokens[idx].toLowerCase())
      // Fetch only the missing tokens
      if (!query.length) {
        break
      }

      const { vectors: fetched } = await this._langClient.vectorize(query, lang)

      if (fetched.length !== query.length) {
        throw new Error(
          `Language Provider didn't receive as many vectors as we asked for (asked ${query.length} and received ${fetched.length})`
        )
      }

      // Reconstruct them in our array and cache them for future cache lookup
      group.forEach((tokenIdx, fetchIdx) => {
        vectors[tokenIdx] = Float32Array.from(fetched[fetchIdx])
        this._vectorsCache.set(getCacheKey(tokens[tokenIdx]), vectors[tokenIdx])
      })

      await this._onVectorsCacheChanged()
    }

    return vectors
  }

  public async tokenize(utterances: string[], lang: string, vocab: string[] = []): Promise<string[][]> {
    if (!utterances.length) {
      return []
    }

    const getCacheKey = (t: string) => `${lang}_${this._hash(t)}`
    const tokenUtterances: string[][] = Array(utterances.length)
    const idxToFetch: number[] = [] // the utterances we need to fetch remotely

    utterances.forEach((utterance, idx) => {
      if (this._tokensCache.has(getCacheKey(utterance))) {
        tokenUtterances[idx] = this._tokensCache.get(getCacheKey(utterance))!
      } else {
        idxToFetch.push(idx)
      }
    })

    // At this point, final[] contains the utterances we had cached
    // It has some "holes", we kept track of the indices where those wholes are in `idxToFetch`

    while (idxToFetch.length) {
      // While there's utterances we haven't tokenized yet
      // We're going to batch requests by maximum 150KB worth's of utterances
      let totalSize = 0
      const sliceUntil = idxToFetch.reduce(
        (topIdx, idx, i) => ((totalSize += utterances[idx].length * 4) < MAX_PAYLOAD_SIZE ? i : topIdx),
        0
      )
      const batch = idxToFetch.splice(0, sliceUntil + 1)
      const query = batch.map((idx) => utterances[idx].toLowerCase())

      if (!query.length) {
        break
      }

      let { tokens: fetched } = await this._langClient.tokenize(query, lang)
      fetched = fetched.map((toks) => processUtteranceTokens(toks, vocab))

      if (fetched.length !== query.length) {
        throw new Error(
          `Language Provider didn't receive as many utterances as we asked for (asked ${query.length} and received ${fetched.length})`
        )
      }

      // Reconstruct them in our array and cache them for future cache lookup
      batch.forEach((utteranceIdx, fetchIdx) => {
        tokenUtterances[utteranceIdx] = Array.from(fetched[fetchIdx])
        this._tokensCache.set(getCacheKey(utterances[utteranceIdx]), tokenUtterances[utteranceIdx])
      })

      await this._onTokensCacheChanged()
    }

    // we restore original chars and casing
    return tokenUtterances.map((tokens, i) => restoreOriginalUtteranceCasing(tokens, utterances[i]))
  }

  private _makeVectorCache = (): lru<string, Float32Array> => {
    return new lru<string, Float32Array>({
      length: (arr: Float32Array) => {
        if (arr && arr.BYTES_PER_ELEMENT) {
          return arr.length * arr.BYTES_PER_ELEMENT
        } else {
          return 300 /* dim */ * Float32Array.BYTES_PER_ELEMENT
        }
      },
      max: 300 /* dim */ * Float32Array.BYTES_PER_ELEMENT /* bytes */ * 500000 /* tokens */
    })
  }

  private _makeTokenCache = (): lru<string, string[]> => {
    return new lru<string, string[]>({
      length: (val: string[], key: string) => key.length * 4 + sumBy(val, (x) => x.length * 4),
      max:
        4 * // bytes in strings
        5 * // average size of token
        10 * // nb of tokens per utterance
        10 * // nb of utterances per intent
        200 * // nb of intents per model
        10 * // nb of models per bot
        50 // nb of bots
      // total is ~ 200 mb
    })
  }

  private _computeCacheFilesPaths = () => {
    const versionHash = this._computeVersionHash()
    const vectorsCachePath = path.join(this._cacheDir, `${VECTOR_FILE_PREFIX}_${versionHash}.json`)
    const tokensCachePath = path.join(this._cacheDir, `${TOKEN_FILE_PREFIX}_${versionHash}.json`)
    return { vectorsCachePath, tokensCachePath }
  }

  private _clearOldCacheFiles = async () => {
    const cacheExists = await fse.pathExists(this._cacheDir)
    if (!cacheExists) {
      return
    }

    const allCacheFiles = await fse.readdir(this._cacheDir)

    const currentHash = this._computeVersionHash()

    const fileStartWithPrefix = (fileName: string) => {
      return fileName.startsWith(VECTOR_FILE_PREFIX) || fileName.startsWith(TOKEN_FILE_PREFIX)
    }

    const fileEndsWithIncorrectHash = (fileName: string) => !fileName.includes(currentHash)

    const filesToDelete = allCacheFiles
      .filter(fileStartWithPrefix)
      .filter(fileEndsWithIncorrectHash)
      .map((f) => path.join(this._cacheDir, f))

    for (const f of filesToDelete) {
      await fse.unlink(f)
    }
  }

  private _onTokensCacheChanged = debounce(async () => {
    if (!this._cacheDumpDisabled) {
      await this._dumpTokensCache()
    }
  }, ms('5s'))

  private _onVectorsCacheChanged = debounce(async () => {
    if (!this._cacheDumpDisabled) {
      await this._dumpVectorsCache()
    }
  }, ms('5s'))

  private async _dumpTokensCache() {
    try {
      const { tokensCachePath } = this._computeCacheFilesPaths()
      await fse.ensureFile(tokensCachePath)
      await fse.writeJson(tokensCachePath, this._tokensCache.dump())
      this._logger.debug(`tokens cache updated at: ${tokensCachePath}`)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.debug(`could not persist tokens cache, error: ${err.message}`)
      this._cacheDumpDisabled = true
    }
  }

  private async _restoreTokensCache() {
    try {
      const { tokensCachePath } = this._computeCacheFilesPaths()
      if (await fse.pathExists(tokensCachePath)) {
        const dump = await fse.readJSON(tokensCachePath)
        this._tokensCache.load(dump)
      }
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.debug(`could not restore tokens cache, error: ${err.message}`)
    }
  }

  private async _dumpVectorsCache() {
    try {
      const { vectorsCachePath } = this._computeCacheFilesPaths()
      await fse.ensureFile(vectorsCachePath)
      await fse.writeJSON(vectorsCachePath, this._vectorsCache.dump())
      this._logger.debug(`vectors cache updated at: ${vectorsCachePath}`)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.debug(`could not persist vectors cache, error: ${err.message}`)
      this._cacheDumpDisabled = true
    }
  }

  private async _restoreVectorsCache() {
    try {
      const { vectorsCachePath } = this._computeCacheFilesPaths()
      if (await fse.pathExists(vectorsCachePath)) {
        const dump = await fse.readJSON(vectorsCachePath)
        if (dump) {
          const kve = dump.map((x) => ({ e: x.e, k: x.k, v: Float32Array.from(Object.values(x.v)) }))
          this._vectorsCache.load(kve)
        }
      }
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this._logger.debug(`could not restore vectors cache, error: ${err.message}`)
    }
  }

  private _computeVersionHash = () => {
    const { _cacheFormatVersion, _langServerInfo } = this
    const { dim, domain, version: langServerVersion } = _langServerInfo
    const hashContent = `${_cacheFormatVersion}:${langServerVersion}:${dim}:${domain}`
    return crypto.createHash('md5').update(hashContent).digest('hex')
  }

  private _hash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex')
  }
}
