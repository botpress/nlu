import { Client, LanguageInfo, VectorizeResult, TokenizeResult, LanguageState } from '@botpress/lang-client'
import httpsProxyAgent from 'https-proxy-agent'
import { LangServerError } from '../../errors'

export class LanguageClient {
  private _client: Client

  constructor(languageURL: string, languageAuthToken?: string) {
    const proxyConfig = process.env.PROXY ? { httpsAgent: new httpsProxyAgent(process.env.PROXY) } : {}

    const headers: _.Dictionary<string> = {}
    if (languageAuthToken) {
      headers['authorization'] = `bearer ${languageAuthToken}`
    }

    this._client = new Client({
      baseURL: languageURL,
      headers,
      ...proxyConfig
    })
  }

  public async getInfo(): Promise<LanguageInfo> {
    try {
      const infoRes = await this._client.getInfo()
      if (!infoRes.success) {
        const { error } = infoRes
        throw new LangServerError(error)
      }
      const { success, ...info } = infoRes
      return info
    } catch (err) {
      throw this._mapError(err)
    }
  }

  public async getLanguages(): Promise<LanguageState> {
    try {
      const langRes = await this._client.getLanguages()
      if (!langRes.success) {
        const { error } = langRes
        throw new LangServerError(error)
      }
      const { success, ...langState } = langRes
      return langState
    } catch (err) {
      throw this._mapError(err)
    }
  }

  public async vectorize(tokens: string[], language: string): Promise<VectorizeResult> {
    try {
      const vectorResponse = await this._client.vectorize(tokens, language)
      if (!vectorResponse.success) {
        const { error } = vectorResponse
        throw new LangServerError(error)
      }
      const { success, ...vectorResult } = vectorResponse
      return vectorResult
    } catch (err) {
      throw this._mapError(err)
    }
  }

  public async tokenize(utterances: string[], language: string): Promise<TokenizeResult> {
    try {
      const tokenResponse = await this._client.tokenize(utterances, language)
      if (!tokenResponse.success) {
        const { error } = tokenResponse
        throw new LangServerError(error)
      }
      const { success, ...tokenResult } = tokenResponse
      return tokenResult
    } catch (err) {
      throw this._mapError(err)
    }
  }

  private _mapError = (thrown: any) => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    if (err instanceof LangServerError) {
      return err
    }
    const { message, stack } = err
    return new LangServerError({ message, stack, code: -1, type: 'unknown' })
  }
}
