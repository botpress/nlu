import { http } from '@botpress/nlu-client'

export class UnsuccessfullAPICall extends Error {
  constructor(nluError: http.NLUError, hint?: string) {
    const { message } = nluError
    super(`An error occured when querying the NLU Server: "${message}". \n${hint}`)
  }
}

export class UnsuccessfullModelTransfer extends Error {
  constructor(status: string, verb: 'GET' | 'POST') {
    const action = verb === 'GET' ? 'downloading' : 'uploading'
    super(`${action} model weights returned with status: "${status}".`)
  }
}

export class PrecondtionFailed extends Error {}
