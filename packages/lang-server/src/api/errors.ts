const escapeHtmlSimple = (str: string) => {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
}

export abstract class ResponseError extends Error {
  public statusCode: number
  constructor(message: string, statusCode: number) {
    super(escapeHtmlSimple(message))
    Error.captureStackTrace(this, this.constructor)
    this.statusCode = statusCode
  }
}

export class BadRequestError extends ResponseError {
  constructor(message: string) {
    super(`Bad Request: ${message}`, 400)
  }
}

export class NotReadyError extends ResponseError {
  constructor(service: string) {
    super(`Service Not Ready: ${service}`, 400)
  }
}

export class UnauthorizedError extends ResponseError {
  constructor(message: string) {
    super(`Unauthorized: ${message}`, 401)
  }
}

export class OfflineError extends ResponseError {
  constructor() {
    super('The server is running in offline mode. This function is disabled.', 404)
  }
}
