import { PipelineComponent } from 'src/component'
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

export type NoneableIntentTrainInput = {
  allUtterances: Utterance[]
} & IntentTrainInput

export type NoneableIntentPredictions = {
  oos: number
} & IntentPredictions

export type IntentClassifier = PipelineComponent<IntentTrainInput, Utterance, IntentPredictions>
export type NoneableIntentClassifier = PipelineComponent<NoneableIntentTrainInput, Utterance, NoneableIntentPredictions>
