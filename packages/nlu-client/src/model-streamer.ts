import { AxiosInstance } from 'axios'
import { Readable } from 'stream'
import { APP_HEADER } from './client'
import { ModelStream } from './typings'
import { ErrorResponse } from './typings/http'
import { validateBinResponse, validateStreamResponse } from './validation'

export class ModelStreamer {
  constructor(private _axios: AxiosInstance) {}

  public downloadStreamModel = async (appId: string, modelId: string): Promise<ModelStream | ErrorResponse> => {
    const reqHeaders = APP_HEADER(appId)
    const ressource = `model/${modelId}`
    const res = await this._axios.get(ressource, {
      headers: reqHeaders,
      responseType: 'stream'
    })
    const { headers: resHeaders } = res
    const validRes = validateStreamResponse({ verb: 'GET', ressource }, res)
    if (validRes instanceof Readable) {
      const length = resHeaders['content-length'] ?? 0
      const stream: ModelStream = { ...validRes, length } as ModelStream
      return stream
    }
    return validRes
  }

  public downloadBufferModel = async (appId: string, modelId: string): Promise<Buffer | ErrorResponse> => {
    const reqHeaders = APP_HEADER(appId)
    const ressource = `model/${modelId}`
    const res = await this._axios.get(ressource, {
      headers: reqHeaders,
      responseType: 'arraybuffer'
    })
    const buff = validateBinResponse({ verb: 'GET', ressource }, res)
    return buff
  }
}
