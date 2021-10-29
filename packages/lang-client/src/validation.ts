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
  constructor(call: HTTPCall, message: string) {
    super(`(${call.verb} ${call.ressource}) ${message}`)
  }
}

export const responseValidator = (call: HTTPCall) => <S extends SuccessReponse>(res: any): S | ErrorResponse => {
  if (_.isNil(res)) {
    throw new ClientResponseError(call, 'Received empty HTTP response.')
  }
  if (typeof res !== 'object') {
    const responseType = typeof res
    throw new ClientResponseError(call, `Received ${responseType} HTTP response. Expected response to be an object.`)
  }
  if (res.success === true) {
    return res
  }
  if (res.success === false) {
    const { error } = res
    if (_.isNil(error) || typeof error !== 'object') {
      throw new ClientResponseError(
        call,
        'Received unsuccessfull HTTP response with no error. Expected response.error to be an object.'
      )
    }
    return Joi.attempt(error, ERROR_RESPONSE_SCHEMA)
  }
  throw new ClientResponseError(
    call,
    'Received HTTP response body has no attribute "success". Expected response.success to be a boolean.'
  )
}
