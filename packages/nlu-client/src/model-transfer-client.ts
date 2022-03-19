import { AxiosInstance } from 'axios'
import { Readable } from 'stream'
import { ModelStream } from './typings'
import { ErrorResponse, SuccessReponse } from './typings/http'
import { appHeader, mapErr } from './utils'
import { HTTPCall, validateBinResponse, validateJSONResponse, validateStreamResponse } from './validation'

export class ModelTransferClient {
  constructor(private _axios: AxiosInstance) {}

  public downloadStreamModel = async (appId: string, modelId: string): Promise<ModelStream | ErrorResponse> => {
    const reqHeaders = appHeader(appId)
    const ressource = `model/${modelId}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }

    try {
      const res = await this._axios.get(ressource, {
        headers: reqHeaders,
        responseType: 'stream'
      })
      const { headers: resHeaders } = res
      const validRes = validateStreamResponse(call, res)
      if (validRes instanceof Readable) {
        const length = resHeaders['content-length'] ?? 0
        const stream = validRes as ModelStream
        stream.length = length
        return stream
      }
      return validRes
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw mapErr(call, err)
    }
  }

  public downloadBufferModel = async (appId: string, modelId: string): Promise<Buffer | ErrorResponse> => {
    const reqHeaders = appHeader(appId)
    const ressource = `model/${modelId}`
    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }

    try {
      const res = await this._axios.get(ressource, {
        headers: reqHeaders,
        responseType: 'arraybuffer'
      })
      const buff = validateBinResponse(call, res)
      return buff
    } catch (err) {
      // axios validate status does not prevent all exceptions
      throw mapErr(call, err)
    }
  }

  public uploadBufferModel = async (appId: string, modelBuffer: Buffer): Promise<SuccessReponse | ErrorResponse> => {
    const appIdHeaders = appHeader(appId)
    const ressource = 'model'
    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }

    const reqHeaders = {
      ...appIdHeaders,
      'content-type': 'application/octet-stream',
      'content-length': modelBuffer.length
    }

    const res = await this._axios.post(ressource, modelBuffer, {
      headers: reqHeaders,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    return validateJSONResponse(call, res)
  }
}
