import axios from 'axios'
import _ from 'lodash'
import { UsagePayload, UsageData, UsageSender, UsageType } from './typings'

export class UsageClient {
  constructor(private usageURL: string) {}

  public async sendUsage<S extends UsageSender, T extends UsageType>(sender: S, type: T, records: UsageData<S, T>[]) {
    const timestamp = new Date().toISOString()
    const usage: UsagePayload<S, T> = {
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
      await axios.post(this.usageURL, usage)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const { data } = err.response
        const message = this._serialize(data)
        err.message += `: ${message}`
      }
      throw err
    }
  }

  private _serialize = (data: any): string => {
    if (_.isString(data)) {
      return data
    }
    try {
      const str = JSON.stringify(data)
      return str
    } catch (err) {
      return `${data}`
    }
  }
}
