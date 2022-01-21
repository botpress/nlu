import axios, { AxiosInstance } from 'axios'
import retry from 'bluebird-retry'
import httpsProxyAgent from 'https-proxy-agent'
import _ from 'lodash'
import { DucklingServerError } from '../../errors'
import { Duckling } from './typings'

export type DucklingParams = {
  tz: string
  refTime: number
  lang: string
}

const RETRY_POLICY: retry.Options = { backoff: 2, max_tries: 3, timeout: 500 }

export class DucklingClient {
  private _client: AxiosInstance

  constructor(url: string) {
    const proxyConfig = process.env.PROXY ? { httpsAgent: new httpsProxyAgent(process.env.PROXY) } : {}
    this._client = axios.create({
      baseURL: url,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      ...proxyConfig
    })
  }

  public async init(): Promise<void> {
    let success = false
    try {
      await retry(async () => {
        const { data } = await this._client.get('/')
        if (data !== 'quack!') {
          throw new DucklingServerError('Bad response from Duckling server')
        }
        success = true
      }, RETRY_POLICY)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw this._mapError(new Error(`Couldn't reach the Duckling server. ${err.message}`))
    }
  }

  public async fetchDuckling(text: string, { lang, tz, refTime }: DucklingParams): Promise<Duckling[]> {
    try {
      return await retry(async () => {
        const { data } = await this._client.post(
          '/parse',
          `lang=${lang}&text=${encodeURI(text)}&reftime=${refTime}&tz=${tz}`
        )

        if (!_.isArray(data)) {
          throw new Error('Unexpected response from Duckling. Expected an array.')
        }

        return data
      }, RETRY_POLICY)
    } catch (err) {
      throw this._mapError(err)
    }
  }

  private _mapError = (thrown: any): Error => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    if (err instanceof DucklingServerError) {
      return err
    }
    const { message, stack } = err
    return new DucklingServerError(message, stack)
  }
}
