import { LanguageSource } from '../engine'
import { APIOptions } from './api'

export type CommandLineOptions = APIOptions & {
  languageURL: string
  languageAuthToken?: string
  ducklingURL: string
  ducklingEnabled: boolean
}

export type StanOptions = APIOptions & {
  languageSources: LanguageSource[] // when passed by env variable, there can be more than one lang server
  ducklingURL: string
  ducklingEnabled: boolean
}

export const mapCli = (c: CommandLineOptions): StanOptions => {
  const { ducklingEnabled, ducklingURL, modelCacheSize, languageURL, languageAuthToken } = c
  return {
    ...c,
    languageSources: [
      {
        endpoint: languageURL,
        authToken: languageAuthToken
      }
    ],
    ducklingEnabled,
    ducklingURL,
    modelCacheSize
  }
}
