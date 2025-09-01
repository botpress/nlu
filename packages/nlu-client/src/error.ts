import { HTTPCall, HTTPVerb } from './http-call'

export class ClientResponseError extends Error {
  constructor(call: HTTPCall<HTTPVerb>, status: number, message: string) {
    const { verb, resource } = call
    const resourcePath = `<nlu-server>/${resource}`
    const prefix = `${verb} ${resourcePath} -> ${status}`
    super(`(${prefix}) ${message}`)
  }
}
