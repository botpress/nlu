import Joi from 'joi'
import _ from 'lodash'
import { SuccessReponse, ErrorResponse } from './typings/http'

const ERROR_RESPONSE_SCHEMA = Joi.object().keys({
  message: Joi.string().required().allow(''),
  stack: Joi.string().optional().allow(''),
  code: Joi.number().required(),
  type: Joi.string().required()
})

export const validateResponse = <S extends SuccessReponse>(res: any): S | ErrorResponse => {
  if (_.isNil(res)) {
    throw new Error('Received empty HTTP response.')
  }
  if (typeof res !== 'object') {
    const responseType = typeof res
    throw new Error(`Received ${responseType} HTTP response. Expected response to be an object.`)
  }
  if (res.success === true) {
    return res
  }
  if (res.success === false) {
    const { error } = res
    if (_.isNil(error) || typeof error !== 'object') {
      throw new Error('Received unsuccessfull HTTP response with no error. Expected response.error to be an object.')
    }
    return Joi.attempt(error, ERROR_RESPONSE_SCHEMA)
  }
  throw new Error('Received HTTP response body has no attribute "success". Expected response.success to be a boolean.')
}
