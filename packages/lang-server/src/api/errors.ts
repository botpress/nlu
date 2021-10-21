import { escapeHtmlSimple } from './http'

/**
 * The object that wraps HTTP errors.
 *
 * @constructor
 * @param message - The error message that will be sent to the end-user
 * @param statusCode - The HTTP status code
 * @param errorCode - Botpress error codes e.g. BP_0001, BP_0002, etc.
 */
export abstract class ResponseError extends Error {
  errorCode: string | undefined
  statusCode: number

  skipLogging = false

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(escapeHtmlSimple(message))
    Error.captureStackTrace(this, this.constructor)
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

export class BadRequestError extends ResponseError {
  type = 'BadRequestError'

  constructor(message: string) {
    super(`Bad Request: ${message}`, 400, 'BP_0040')
    this.skipLogging = true
  }
}

export class NotReadyError extends ResponseError {
  type = 'NotReadyError'

  constructor(service: string) {
    super(`Service Not Ready: ${service}`, 400, 'BP_0140')
    this.skipLogging = true
  }
}

export class UnauthorizedError extends ResponseError {
  type = 'UnauthorizedError'

  constructor(message: string) {
    super(`Unauthorized: ${message}`, 401, 'BP_0041')
  }
}

export class OfflineError extends ResponseError {
  constructor() {
    super('The server is running in offline mode. This function is disabled.', 404)
  }
}
