import { ClientResponseError, HTTPCall, HTTPVerb } from './validation'

export const appHeader = (appId: string) => {
  return {
    'X-App-Id': appId
  }
}

export const mapErr = (call: HTTPCall<HTTPVerb>, thrown: any): ClientResponseError => {
  const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
  const httpStatus = -1
  return new ClientResponseError(call, httpStatus, err.message)
}
