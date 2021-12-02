import { Intent, ListEntityModel, PatternEntity } from '../typings'
import Utterance from '../utterance/utterance'

export type IntentTrainInput = {
  languageCode: string
  list_entities: ListEntityModel[]
  pattern_entities: PatternEntity[]
  intents: Intent<Utterance>[]
  nluSeed: number
}

export type IntentPrediction = {
  name: string
  confidence: number
  extractor: string
}
export type IntentPredictions = {
  intents: IntentPrediction[]
}
export type NoneableIntentPredictions = {
  oos: number
} & IntentPredictions

export type IntentClassifier = {
  train(trainInput: IntentTrainInput, progress: (p: number) => void): Promise<void>
  serialize(): string
  load(model: string): Promise<void>
  predict(utterance: Utterance): Promise<IntentPredictions>
}
export type NoneableIntentClassifier = {
  predict(utterance: Utterance): Promise<NoneableIntentPredictions>
}
