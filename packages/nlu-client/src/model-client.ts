import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import _ from 'lodash'
import { Readable } from 'stream'
import { appIdHeader } from './app-id'
import { ClientResponseError } from './error'
import { HTTPCall } from './http-call'

type GET_WEIGHTS_STATUS = 'OK' | 'WEIGHTS_TRANSFER_DISABLED' | 'MODEL_NOT_FOUND'
type POST_WEIGHTS_STATUS = 'OK' | 'WEIGHTS_TRANSFER_DISABLED' | 'INVALID_MODEL_FORMAT' | 'UNSUPORTED_MODEL_SPEC'

const get_status_meanings: Record<GET_WEIGHTS_STATUS, number> = {
  OK: 200,
  WEIGHTS_TRANSFER_DISABLED: 403,
  MODEL_NOT_FOUND: 404
}

const post_status_meanings: Record<POST_WEIGHTS_STATUS, number> = {
  OK: 200,
  INVALID_MODEL_FORMAT: 400,
  WEIGHTS_TRANSFER_DISABLED: 403,
  UNSUPORTED_MODEL_SPEC: 455 // custom unassigned status code
}

type GetWeightRes<S extends GET_WEIGHTS_STATUS, R extends Readable | Buffer> = S extends 'OK'
  ? {
      status: S
      weights: R
    }
  : { status: S }
type PostWeightRes = { status: POST_WEIGHTS_STATUS }

/**
 * This client does not use JSON.
 * Requests and Responses body are binary data.
 * HTTP Status Codes are used for error status.
 */
export class ModelTransferClient {
  protected _axios: AxiosInstance

  constructor(config: AxiosRequestConfig & { baseURL: string }) {
    this._axios = axios.create({ ...config, validateStatus: () => true })
  }

  public get axios() {
    return this._axios
  }

  public async upload(appId: string, weights: Buffer): Promise<PostWeightRes> {
    const ressource = 'modelweights'
    const reqHeaders = {
      ...appIdHeader(appId),
      'content-type': 'application/octet-stream',
      'content-length': weights.length
    }

    const { status } = await this.axios.post(ressource, weights, {
      headers: reqHeaders,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    const call: HTTPCall<'POST'> = { verb: 'POST', ressource }

    if (status >= 500) {
      throw new ClientResponseError(call, status, 'Internal Server Error')
    }

    const statusMeaning = this._statusMeaning(post_status_meanings, status)
    if (!statusMeaning) {
      throw new ClientResponseError(call, status, 'Unexpected HTTP Status')
    }

    return { status: statusMeaning }
  }

  public download(
    appId: string,
    modelId: string,
    opts: { responseType: 'arraybuffer' }
  ): Promise<GetWeightRes<GET_WEIGHTS_STATUS, Buffer>>
  public download(
    appId: string,
    modelId: string,
    opts: { responseType: 'stream' }
  ): Promise<GetWeightRes<GET_WEIGHTS_STATUS, Readable>>
  public async download(
    appId: string,
    modelId: string,
    opts: { responseType: 'stream' | 'arraybuffer' }
  ): Promise<GetWeightRes<GET_WEIGHTS_STATUS, Readable | Buffer>> {
    const ressource = `modelweights/${modelId}`
    const { responseType } = opts

    const reqHeaders = appIdHeader(appId)
    const { data, status } = await this.axios.get(ressource, { headers: reqHeaders, responseType })

    const call: HTTPCall<'GET'> = { verb: 'GET', ressource }
    if (status >= 500) {
      throw new ClientResponseError(call, status, 'Internal Server Error')
    }

    const statusMeaning = this._statusMeaning(get_status_meanings, status)
    if (!statusMeaning) {
      throw new ClientResponseError(call, status, 'Unexpected HTTP Status')
    }

    if (statusMeaning === 'OK') {
      return { status: statusMeaning, weights: data }
    }
    return { status: statusMeaning }
  }

  private _statusMeaning = <S extends GET_WEIGHTS_STATUS | POST_WEIGHTS_STATUS>(
    availableStatus: Record<S, number>,
    status: number
  ): S | undefined => {
    return _.findKey(availableStatus, (s) => s === status) as S | undefined
  }
}
