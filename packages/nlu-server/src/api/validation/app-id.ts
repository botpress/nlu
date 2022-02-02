import { InvalidRequestFormatError } from '../errors'

const APP_ID_PATTERN = /^[a-zA-Z_][a-zA-Z_\-\/0-9]*$/

export const validateAppId = (appId: string): string => {
  if (!APP_ID_PATTERN.test(appId)) {
    throw new InvalidRequestFormatError(`App Id contains invalid characters: ${appId}`)
  }
  return appId
}
