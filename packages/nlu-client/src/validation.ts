import Joi from 'joi'
import { SuccessReponse, ErrorResponse } from './typings/http'

const allowUnknownKeys = (obj: Joi.ObjectSchema): Joi.ObjectSchema => {
  return obj.pattern(/./, Joi.string())
}

const ERROR_RESPONSE_SCHEMA = allowUnknownKeys(
  Joi.object().keys({
    success: Joi.boolean().strict().not(true).required(),
    error: Joi.string().allow('').required()
  })
)

const SUCCESS_RESPONSE_SCHEMA = allowUnknownKeys(
  Joi.object().keys({
    success: Joi.boolean().strict().not(false).required()
  })
)

const RESPONSE_SCHEMA = Joi.object()
  .keys({ success: Joi.boolean().required() })
  .when('.success', {
    switch: [
      {
        is: true,
        then: SUCCESS_RESPONSE_SCHEMA
      },
      {
        is: false,
        then: ERROR_RESPONSE_SCHEMA
      }
    ]
  })

export const validateResponse = <S extends SuccessReponse>(res: any): S | ErrorResponse => {
  return Joi.attempt(res, RESPONSE_SCHEMA)
}
