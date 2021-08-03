// This method is only used for basic escaping of error messages, do not use for page display
export const escapeHtmlSimple = (str: string) => {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
}

/**
 * The object that wraps HTTP errors.
 *
 * @constructor
 * @param message - The error message that will be sent to the end-user
 * @param statusCode - The HTTP status code
 */
export class ResponseError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(escapeHtmlSimple(message))
    Error.captureStackTrace(this, this.constructor)
  }
}

export class UnauthorizedError extends ResponseError {
  constructor(message: string) {
    super(`Unauthorized: ${message}`, 401)
  }
}

export class InvalidRequestFormatError extends ResponseError {
  constructor(message: string) {
    super(`Invalid Request Format: ${message}`, 400)
  }
}
