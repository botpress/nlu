import { ModelResult } from '@microsoft/recognizers-text'

export type MicrosoftValue = {
  value: string
  unit?: string
  type?: string
  score?: number
  otherResults?: any[]
}

export type MicrosoftTimeValues = {
  timex: string
  type: string
  start?: string
  end?: string
  value?: string
  Mod?: string
  sourceEntity?: string
}

export type MicrosoftValues = {
  values: MicrosoftTimeValues[]
}

export type MicrosoftResolution = MicrosoftValue | MicrosoftValues

export type MicrosoftEntity = {
  start: number
  end: number
  resolution: MicrosoftResolution
  text: string
  typeName: string
} & ModelResult

export type MicrosoftSupportedLanguage = 'zh' | 'nl' | 'en' | 'fr' | 'de' | 'it' | 'ja' | 'pt' | 'es'
