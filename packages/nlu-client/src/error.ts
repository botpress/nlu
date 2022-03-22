import { HTTPCall, HTTPVerb } from './http-call'

export class ClientResponseError extends Error {
  constructor(call: HTTPCall<HTTPVerb>, status: number, message: string) {
    const { verb, ressource } = call
    const ressourcePath = `<nlu-server>/${ressource}`
    const prefix = `${verb} ${ressourcePath} -> ${status}`
    super(`(${prefix}) ${message}`)
  }
}
