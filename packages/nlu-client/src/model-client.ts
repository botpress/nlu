import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import _ from 'lodash'
import { Readable } from 'stream'
import { ModelServerInfo, UploadModelResponse } from './typings/model'

export class ModelTransferClient {
  protected _axios: AxiosInstance

  constructor(config: AxiosRequestConfig & { baseURL: string }) {
    this._axios = axios.create({ ...config })
  }

  public get axios() {
    return this._axios
  }

  public async getInfo(): Promise<ModelServerInfo> {
    const { data } = await this.axios.get('/info')
    return data
  }

  public async uploadModelWeights(weights: Buffer): Promise<UploadModelResponse> {
    const reqHeaders = { 'content-type': 'application/octet-stream', 'content-length': weights.length }
    const { data } = await this.axios.post('/', weights, {
      headers: reqHeaders,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })
    return data
  }

  public downloadModelWeights(uuid: string, opts: { responseType: 'arraybuffer' }): Promise<Buffer>
  public downloadModelWeights(uuid: string, opts: { responseType: 'stream' }): Promise<Readable>
  public async downloadModelWeights(
    uuid: string,
    opts: { responseType: 'arraybuffer' | 'stream' }
  ): Promise<Readable | Buffer> {
    const { responseType } = opts
    const { data } = await this.axios.get(`/${uuid}`, { responseType })
    return data
  }
}
