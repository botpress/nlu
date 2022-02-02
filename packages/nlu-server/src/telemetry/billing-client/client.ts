import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import _ from 'lodash'
import { BillingUsage, BillingUsageData, BillingUsageSender, BillingUsageType } from './typings'

export class BillingClient {
  protected _axios: AxiosInstance

  constructor(config: AxiosRequestConfig) {
    this._axios = axios.create({ ...config })
  }

  public async sendUsage<S extends BillingUsageSender, T extends BillingUsageType>(
    sender: S,
    type: T,
    records: BillingUsageData<S, T>[]
  ) {
    const timestamp = new Date().toISOString()
    const usage: BillingUsage<S, T> = {
      meta: {
        timestamp,
        schema_version: '1.0.0',
        sender,
        type
      },
      schema_version: '1.0.0',
      records
    }

    try {
      await this._axios.post('v1/billing/usage', usage)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response && _.isString(err.response?.data)) {
        err.message += `: ${err.response.data}`
      }
      throw err
    }
  }
}
