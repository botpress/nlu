import { AxiosResponse } from 'axios'
import Joi from 'joi'
import _ from 'lodash'
import { SuccessReponse, ErrorResponse } from './typings'

const ERROR_RESPONSE_SCHEMA = Joi.object().keys({
  message: Joi.string().required().allow(''),
  stack: Joi.string().optional().allow(''),
  code: Joi.number().required(),
  type: Joi.string().required()
})

type HTTPVerb = 'GET' | 'POST' | 'PUT' | 'DELETE'
interface HTTPCall {
  verb: HTTPVerb
  ressource: string
}
class ClientResponseError extends Error {
  constructor(call: HTTPCall, status: number, message: string) {
    if (status >= 300) {
      super(`(${call.verb} ${call.ressource}) Received HTTP Status ${status}`)
      return
    }
    super(`(${call.verb} ${call.ressource}) ${message}`)
  }
}

export const responseValidator = (call: HTTPCall) => <S extends SuccessReponse>(
  res: AxiosResponse<S | ErrorResponse>
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
    Joi.assert(error, ERROR_RESPONSE_SCHEMA)
    return data
  }

  throw new ClientResponseError(
    call,
    status,
    'Received HTTP response body has no attribute "success". Expected response.success to be a boolean.'
  )
}
