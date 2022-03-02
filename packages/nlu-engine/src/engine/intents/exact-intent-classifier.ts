import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelLoadingError } from '../errors'
import { Intent } from '../typings'
import Utterance, { UtteranceToStringOptions } from '../utterance/utterance'

import { IntentTrainInput, NoneableIntentClassifier, NoneableIntentPredictions } from './intent-classifier'

type Model = {
  intents: string[]
  exact_match_index: ExactMatchIndex
}

type Predictors = Model

type ExactMatchIndex = _.Dictionary<{ intent: string }>

const PTBExactIndexValue = new ptb.PTBMessage('ExactIndexValue', {
  intent: { type: 'string', id: 1 }
})

const PTBExactIntentModel = new ptb.PTBMessage('ExactIntentModel', {
  intents: { type: 'string', id: 1, rule: 'repeated' },
  exact_match_index: { keyType: 'string', type: PTBExactIndexValue, id: 2, rule: 'map' }
})

const EXACT_MATCH_STR_OPTIONS: UtteranceToStringOptions = {
  lowerCase: true,
  onlyWords: true,
  strategy: 'replace-entity-name'
}

export class ExactIntenClassifier implements NoneableIntentClassifier<typeof PTBExactIntentModel> {
  private static _displayName = 'Exact Intent Classifier'
  private static _name = 'exact-matcher'

  private predictors: Predictors | undefined

  public get name() {
    return ExactIntenClassifier._name
  }

  public static get modelType() {
    return PTBExactIntentModel
  }

  public get modelType() {
    return PTBExactIntentModel
  }

  public async train(
    trainInput: IntentTrainInput,
    progress: (p: number) => void
  ): Promise<ptb.Infer<typeof PTBExactIntentModel>> {
    const { intents } = trainInput
    const exact_match_index = this._buildExactMatchIndex(intents)

    progress(1)

    return {
      intents: intents.map((i) => i.name),
      exact_match_index
    }
  }

  private _buildExactMatchIndex = (intents: Intent<Utterance>[]): ExactMatchIndex => {
    return _.chain(intents)
      .flatMap((i) =>
        i.utterances.map((u) => ({
          utterance: u.toString(EXACT_MATCH_STR_OPTIONS),
          contexts: i.contexts,
          intent: i.name
        }))
      )
      .filter(({ utterance }) => !!utterance)
      .reduce((index, { utterance, intent }) => {
        index[utterance] = { intent }
        return index
      }, {} as ExactMatchIndex)
      .value()
  }

  public async load(serialized: ptb.Infer<typeof PTBExactIntentModel>) {
    try {
      const { intents, exact_match_index } = serialized
      const model: Model = {
        intents: intents ?? [],
        exact_match_index
      }
      this.predictors = model
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(ExactIntenClassifier._displayName, err)
    }
  }

  public async predict(utterance: Utterance): Promise<NoneableIntentPredictions> {
    if (!this.predictors) {
      throw new Error(`${ExactIntenClassifier._displayName} must load model before calling predict.`)
    }

    const { exact_match_index, intents: intentNames } = this.predictors

    const exactPred = this._findExactIntent(exact_match_index, utterance)

    if (exactPred) {
      const oneHot = intentNames.map((name) => ({ name, confidence: name === exactPred ? 1 : 0, extractor: this.name }))
      return {
        oos: 0,
        intents: oneHot
      }
    }

    const zeros = intentNames.map((name) => ({ name, confidence: 0, extractor: this.name }))
    return {
      oos: 1,
      intents: zeros
    }
  }

  private _findExactIntent(exactMatchIndex: ExactMatchIndex, utterance: Utterance): string | undefined {
    const candidateKey = utterance.toString(EXACT_MATCH_STR_OPTIONS)
    const maybeMatch = exactMatchIndex[candidateKey]
    if (maybeMatch) {
      return maybeMatch.intent
    }
  }
}
