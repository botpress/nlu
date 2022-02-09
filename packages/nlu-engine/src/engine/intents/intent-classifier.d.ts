import { Intent, ListEntityModel, PatternEntity, PipelineComponent } from '../typings'
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

export type NoneableIntentTrainInput = {
  allUtterances: Utterance[]
} & IntentTrainInput

export type NoneableIntentPredictions = {
  oos: number
} & IntentPredictions

export type IntentClassifier = PipelineComponent<IntentTrainInput, IntentPredictions>
export type NoneableIntentClassifier = PipelineComponent<NoneableIntentTrainInput, NoneableIntentPredictions>
