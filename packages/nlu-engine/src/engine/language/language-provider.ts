import { Client as LangClient } from '@botpress/lang-client'
import axios from 'axios'
import retry from 'bluebird-retry'
import crypto from 'crypto'
import fse from 'fs-extra'
import httpsProxyAgent from 'https-proxy-agent'
import _, { debounce, sumBy } from 'lodash'
import lru from 'lru-cache'
import ms from 'ms'
import path from 'path'
import semver from 'semver'
import { Logger as ILogger } from '../../typings'

import { isSpace, processUtteranceTokens, restoreOriginalUtteranceCasing } from '../tools/token-utils'
import { LangServerInfo } from '../typings'
import { LangServerError } from './lang-server-error'

const MAX_PAYLOAD_SIZE = 150 * 1024 // 150kb
const VECTOR_FILE_PREFIX = 'lang_vectors'
const TOKEN_FILE_PREFIX = 'utterance_tokens'

export interface LangProviderDependencies {
  languageURL: string
  languageAuthToken?: string
  logger: ILogger
  cacheDir: string
}

export class LanguageProvider {
  private _client!: LangClient
  private _cacheDir!: string

  private _vectorsCache!: lru<string, Float32Array>
  private _tokensCache!: lru<string, string[]>

  private _cacheDumpDisabled: boolean = false
  private _languageDims!: number

  private _cacheFormatVersion: string = '1.0.0' // increment when changing cache file format to invalidate old cache files
  private _langServerInfo!: LangServerInfo

  private _logger!: ILogger

  private discoveryRetryPolicy: retry.Options = {
    interval: 1000,
    max_interval: 5000,
    timeout: 2000,
    max_tries: 5
  }

  private _installedLanguages: string[] = []

  get languages(): string[] {
    return [...this._installedLanguages]
  }

  async initialize(args: LangProviderDependencies): Promise<LanguageProvider> {
    const { languageURL, languageAuthToken, logger, cacheDir } = args

    this._logger = logger
    this._cacheDir = cacheDir

    this._vectorsCache = new lru<string, Float32Array>({
      length: (arr: Float32Array) => {
        if (arr && arr.BYTES_PER_ELEMENT) {
          return arr.length * arr.BYTES_PER_ELEMENT
        } else {
          return 300 /* dim */ * Float32Array.BYTES_PER_ELEMENT
        }
      },
      max: 300 /* dim */ * Float32Array.BYTES_PER_ELEMENT /* bytes */ * 500000 /* tokens */
    })

    this._tokensCache = new lru<string, string[]>({
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

    const headers: _.Dictionary<string> = {}

    if (languageAuthToken) {
      headers['authorization'] = `bearer ${languageAuthToken}`
    }

    const proxyConfig = process.env.PROXY ? { httpsAgent: new httpsProxyAgent(process.env.PROXY) } : {}

    this._client = new LangClient({
      baseURL: languageURL,
      headers,
      ...proxyConfig
    })

    try {
      await retry<void>(async () => {
        const infoRes = await this._client.getInfo()
        if (!infoRes.success) {
          const { error } = infoRes
          throw new LangServerError(error)
        }

        const { success, ...info } = infoRes
        if (!info.ready) {
          throw new Error('Language source is not ready')
        }

        if (!this._languageDims) {
          this._languageDims = info.dimentions
        }

        if (this._languageDims !== info.dimentions) {
          throw new Error('Language sources have different dimensions')
        }

        const langRes = await this._client.getLanguages()
        if (!langRes.success) {
          const { error } = langRes
          throw new LangServerError(error)
        }

        const { installed } = langRes
        this._installedLanguages = installed.map((x) => x.code)

        const version = semver.valid(semver.coerce(info.version))
        if (!version) {
          throw new Error('Lang server has an invalid version')
        }
        this._langServerInfo = {
          version: semver.clean(version),
          dim: info.dimentions,
          domain: info.domain
        }
      }, this.discoveryRetryPolicy)
    } catch (err) {
      this.handleLanguageServerError(err, languageURL)
    }

    await this.clearOldCacheFiles()
    await this.restoreVectorsCache()
    await this.restoreTokensCache()

    return this as LanguageProvider
  }

  public get langServerInfo(): LangServerInfo {
    return this._langServerInfo
  }

  private computeCacheFilesPaths = () => {
    const versionHash = this.computeVersionHash()
    const vectorsCachePath = path.join(this._cacheDir, `${VECTOR_FILE_PREFIX}_${versionHash}.json`)
    const tokensCachePath = path.join(this._cacheDir, `${TOKEN_FILE_PREFIX}_${versionHash}.json`)
    return { vectorsCachePath, tokensCachePath }
  }

  private clearOldCacheFiles = async () => {
    const cacheExists = await fse.pathExists(this._cacheDir)
    if (!cacheExists) {
      return
    }

    const allCacheFiles = await fse.readdir(this._cacheDir)

    const currentHash = this.computeVersionHash()

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

  private handleLanguageServerError = (thrownObject: any, endpoint: string): void => {
    const err: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)

    if (!axios.isAxiosError(err)) {
      return this._logger.error(`Could not load Language Provider at ${endpoint}`, err)
    }

    const status = err.response?.status
    const details = err.message

    if (status === 429) {
      this._logger.error(
        `Could not load Language Server: ${details}. You may be over the limit for the number of requests allowed for the endpoint ${endpoint}`
      )
    } else if (status === 401) {
      this._logger.error(`You must provide a valid authentication token for the endpoint ${endpoint}`)
    } else {
      this._logger.error(`Could not load Language Provider at ${endpoint}: ${err.code}`, err)
    }
  }

  private onTokensCacheChanged = debounce(async () => {
    if (!this._cacheDumpDisabled) {
      await this.dumpTokensCache()
    }
  }, ms('5s'))

  private onVectorsCacheChanged = debounce(async () => {
    if (!this._cacheDumpDisabled) {
      await this.dumpVectorsCache()
    }
  }, ms('5s'))

  private async dumpTokensCache() {
    try {
      const { tokensCachePath } = this.computeCacheFilesPaths()
      await fse.ensureFile(tokensCachePath)
      await fse.writeJson(tokensCachePath, this._tokensCache.dump())
      this._logger.debug(`tokens cache updated at: ${tokensCachePath}`)
    } catch (err) {
      this._logger.debug(`could not persist tokens cache, error: ${err.message}`)
      this._cacheDumpDisabled = true
    }
  }

  private async restoreTokensCache() {
    try {
      const { tokensCachePath } = this.computeCacheFilesPaths()
      if (await fse.pathExists(tokensCachePath)) {
        const dump = await fse.readJSON(tokensCachePath)
        this._tokensCache.load(dump)
      }
    } catch (err) {
      this._logger.debug(`could not restore tokens cache, error: ${err.message}`)
    }
  }

  private async dumpVectorsCache() {
    try {
      const { vectorsCachePath } = this.computeCacheFilesPaths()
      await fse.ensureFile(vectorsCachePath)
      await fse.writeJSON(vectorsCachePath, this._vectorsCache.dump())
      this._logger.debug(`vectors cache updated at: ${vectorsCachePath}`)
    } catch (err) {
      this._logger.debug(`could not persist vectors cache, error: ${err.message}`)
      this._cacheDumpDisabled = true
    }
  }

  private async restoreVectorsCache() {
    try {
      const { vectorsCachePath } = this.computeCacheFilesPaths()
      if (await fse.pathExists(vectorsCachePath)) {
        const dump = await fse.readJSON(vectorsCachePath)
        if (dump) {
          const kve = dump.map((x) => ({ e: x.e, k: x.k, v: Float32Array.from(Object.values(x.v)) }))
          this._vectorsCache.load(kve)
        }
      }
    } catch (err) {
      this._logger.debug(`could not restore vectors cache, error: ${err.message}`)
    }
  }

  async vectorize(tokens: string[], lang: string): Promise<Float32Array[]> {
    if (!tokens.length) {
      return []
    }

    const vectors: Float32Array[] = Array(tokens.length)
    const idxToFetch: number[] = [] // the tokens we need to fetch remotely
    const getCacheKey = (t: string) => `${lang}_${this._hash(t)}`

    tokens.forEach((token, i) => {
      if (isSpace(token)) {
        vectors[i] = new Float32Array(this._languageDims) // float 32 Arrays are initialized with 0s
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

      const vectorRes = await this._client.vectorize(query, lang)
      if (!vectorRes.success) {
        const { error } = vectorRes
        throw new LangServerError(error)
      }
      const { vectors: fetched } = vectorRes

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

      await this.onVectorsCacheChanged()
    }

    return vectors
  }

  private _hash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex')
  }

  async tokenize(utterances: string[], lang: string, vocab: string[] = []): Promise<string[][]> {
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
      const sliceUntil = idxToFetch.reduce((topIdx, idx, i) => {
        if ((totalSize += utterances[idx].length * 4) < MAX_PAYLOAD_SIZE) {
          return i
        } else {
          return topIdx
        }
      }, 0)
      const batch = idxToFetch.splice(0, sliceUntil + 1)
      const query = batch.map((idx) => utterances[idx].toLowerCase())

      if (!query.length) {
        break
      }

      const tokendRes = await this._client.tokenize(query, lang)
      if (!tokendRes.success) {
        const { error } = tokendRes
        throw new LangServerError(error)
      }

      let { tokens: fetched } = tokendRes
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

      await this.onTokensCacheChanged()
    }

    // we restore original chars and casing
    return tokenUtterances.map((tokens, i) => restoreOriginalUtteranceCasing(tokens, utterances[i]))
  }

  private computeVersionHash = () => {
    const { _cacheFormatVersion, _langServerInfo } = this
    const { dim, domain, version: langServerVersion } = _langServerInfo
    const hashContent = `${_cacheFormatVersion}:${langServerVersion}:${dim}:${domain}`
    return crypto.createHash('md5').update(hashContent).digest('hex')
  }
}

export default new LanguageProvider()
