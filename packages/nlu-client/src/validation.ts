import { AxiosResponse } from 'axios'
import Joi from 'joi'
import _ from 'lodash'
import { Readable } from 'stream'
import { SuccessReponse, ErrorResponse } from './typings/http'

const ERROR_RESPONSE_SCHEMA = Joi.object().keys({
  message: Joi.string().required().allow(''),
  stack: Joi.string().optional().allow(''),
  code: Joi.number().required(),
  type: Joi.string().required()
})

export type HTTPVerb = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type HTTPCall<V extends HTTPVerb> = {
  verb: V
  ressource: string
}

export class ClientResponseError extends Error {
  constructor(call: HTTPCall<HTTPVerb>, status: number, message: string) {
    const { verb, ressource } = call
    const ressourcePath = `nlu-server/${ressource}`
    const prefix = status >= 300 ? `${verb} ${ressourcePath} -> ${status}` : `${verb} ${ressourcePath}`
    super(`(${prefix}) ${message}`)
  }
}

/** Manual validation for clean error messages */
export const validateJSONResponse = <S extends SuccessReponse>(
  call: HTTPCall<HTTPVerb>,
  res: AxiosResponse
): S | ErrorResponse => {
  const { status, data } = res

  if (_.isNil(data)) {
    throw new ClientResponseError(call, status, 'Received empty HTTP response.')
  }

  if (typeof data !== 'object') {
    const responseType = typeof data
    throw new ClientResponseError(
      call,
      status,
      `Received ${responseType} HTTP response. Expected response to be an object.`
    )
  }

  if (data.success === true) {
    return data
  }

  if (data.success === false) {
    const { error } = data
    if (_.isNil(error) || typeof error !== 'object') {
      throw new ClientResponseError(
        call,
        status,
        'Received unsuccessfull HTTP response with no error. Expected response.error to be an object.'
      )
    }
    const { error: validationError } = ERROR_RESPONSE_SCHEMA.validate(error)
    if (validationError) {
      throw new ClientResponseError(
        call,
        status,
        `Received response with incorrect error format: ${validationError.message}`
      )
    }
    return data
  }

  throw new ClientResponseError(
    call,
    status,
    'Received HTTP response body has no attribute "success". Expected response.success to be a boolean.'
  )
}

export const validateBinResponse = (call: HTTPCall<HTTPVerb>, res: AxiosResponse): Buffer | ErrorResponse => {
  const { data } = res
  if (data instanceof Buffer) {
    return data
  }
  return validateJSONResponse(call, res) as ErrorResponse
}

export const validateStreamResponse = (call: HTTPCall<HTTPVerb>, res: AxiosResponse): Readable | ErrorResponse => {
  const { data } = res
  if (data instanceof Readable) {
    return data
  }
  return validateJSONResponse(call, res) as ErrorResponse
}
