import _ from 'lodash'
import { ErrorSerializer, ErrorDeserializer, SerializedError } from './typings'

export class ErrorHandler implements ErrorSerializer, ErrorDeserializer {
  public deserializeError(err: SerializedError): Error {
    const newErr = new Error(err.message)
    newErr.stack = err.stack
    return newErr
  }

  public serializeError(err: Error): SerializedError {
    const { message, stack } = err
    return { message, stack, data: {} }
  }
}
