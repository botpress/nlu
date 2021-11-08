import { ErrorSerializer, ErrorDeserializer, SerializedError } from '@botpress/worker'
import _ from 'lodash'
import { LangServerError } from '../../errors'

export class ErrorHandler implements ErrorSerializer, ErrorDeserializer {
  public deserializeError(err: SerializedError): Error {
    const { message, stack, data } = err
    if (data.errClass === LangServerError.name) {
      const { code, type } = data
      return new LangServerError({ message, stack, type, code })
    }

    const newErr = new Error(err.message)
    newErr.stack = err.stack
    return newErr
  }

  public serializeError(err: Error): SerializedError {
    if (err instanceof LangServerError) {
      const { code, message, type, stack } = err
      const errClass = LangServerError.name
      return { message, stack, data: { errClass, code, type } }
    }

    const { message, stack } = err
    return { message, stack, data: {} }
  }
}
