import { http } from '@botpress/nlu-client'

export class UnsuccessfullAPICall extends Error {
  constructor(nluError: http.NLUError, hint?: string) {
    const { message } = nluError
    super(`An error occured when querying the NLU Server: "${message}". \n${hint}`)
  }
}
