import { ErrorSerializer, ErrorDeserializer, SerializedError } from '@botpress/worker'
import _ from 'lodash'
import { LangServerError, DucklingServerError } from '../errors'

export class ErrorHandler implements ErrorSerializer, ErrorDeserializer {
  public deserializeError(err: SerializedError): Error {
    const { message, stack, data } = err
    if (data.errClass === LangServerError.name) {
      const { code, type } = data
      return new LangServerError({ message, stack, type, code })
    }
    if (data.errClass === DucklingServerError.name) {
      return new DucklingServerError(message, stack)
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
    if (err instanceof DucklingServerError) {
      const { message, stack } = err
      const errClass = DucklingServerError.name
      return { message, stack, data: { errClass } }
    }

    const { message, stack } = err
    return { message, stack, data: {} }
  }
}
