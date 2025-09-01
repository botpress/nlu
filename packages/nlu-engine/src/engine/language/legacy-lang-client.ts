import { LanguageInfo, LanguageState, VectorizeResult, TokenizeResult } from '@botpress/lang-client'
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios'
import httpsProxyAgent from 'https-proxy-agent'
import { LangServerError } from '../errors'

type HTTPVerb = 'GET' | 'POST' | 'PUT' | 'DELETE'
type HTTPCall<V extends HTTPVerb> = {
  verb: V
  resource: string
}

// TODO: fully remove this ASAP
export class LegacyLanguageClient {
  private _client: AxiosInstance

  constructor(languageURL: string, languageAuthToken?: string) {
    const proxyConfig = process.env.PROXY ? { httpsAgent: new httpsProxyAgent(process.env.PROXY) } : {}

    const headers: _.Dictionary<string> = {}
    if (languageAuthToken) {
      headers['authorization'] = `bearer ${languageAuthToken}`
    }

    this._client = axios.create({
      baseURL: languageURL,
      headers,
      ...proxyConfig
    })
  }

  public async getInfo(): Promise<LanguageInfo> {
    const call: HTTPCall<'GET'> = { resource: 'info', verb: 'GET' }
    const { data } = await this._get(call)
    return data
  }

  public async getLanguages(): Promise<LanguageState> {
    const call: HTTPCall<'GET'> = { resource: 'languages', verb: 'GET' }
    const { data } = await this._get(call)
    return data
  }

  public async vectorize(tokens: string[], lang: string): Promise<VectorizeResult> {
    const call: HTTPCall<'POST'> = { resource: 'vectorize', verb: 'POST' }
    const { data } = await this._post(call, { tokens, lang })
    return data
  }

  public async tokenize(utterances: string[], lang: string): Promise<TokenizeResult> {
    const call: HTTPCall<'POST'> = { resource: 'tokenize', verb: 'POST' }
    const { data } = await this._post(call, { utterances, lang })
    return data
  }

  private _post = async (
    call: HTTPCall<'POST'>,
    body?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<any>> => {
    try {
      const { resource } = call
      const res = await this._client.post(resource, body, config)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapError(call, err)
    }
  }

  private _get = async (call: HTTPCall<'GET'>, config?: AxiosRequestConfig): Promise<AxiosResponse<any>> => {
    try {
      const { resource } = call
      const res = await this._client.get(resource, config)
      return res
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw this._mapError(call, err)
    }
  }

  private _mapError = (call: HTTPCall<HTTPVerb>, thrown: any): Error => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    if (err instanceof LangServerError) {
      return err
    }

    const { message: originalMsg, stack } = err
    const { verb, resource } = call
    const resourcePath = `lang-server/${resource}`
    const prefix = `${verb} ${resourcePath}`
    const message = `(${prefix}) ${originalMsg}`

    return new LangServerError({ message, stack, code: -1, type: 'internal' })
  }
}
