export type PredictOutput = {
  entities: EntityPrediction[]
  contexts: ContextPrediction[]
  spellChecked: string
}

export type EntityType = 'pattern' | 'list' | 'system'

export type EntityPrediction = {
  name: string
  type: string // ex: ['custom.list.fruits', 'system.time']
  value: string
  confidence: number
  source: string
  start: number
  end: number
  unit?: string

  sensitive?: boolean
}

export type ContextPrediction = {
  name: string
  oos: number
  confidence: number
  intents: IntentPrediction[]
}

export type IntentPrediction = {
  name: string
  confidence: number
  slots: SlotPrediction[]
  extractor: string
}

export type SlotPrediction = {
  name: string
  value: string
  confidence: number
  source: string
  start: number
  end: number
  entity: EntityPrediction | null
}
