import _ from 'lodash'
import { ModelLoadingError } from '../../errors'
import { Intent } from '../typings'
import Utterance, { UtteranceToStringOptions } from '../utterance/utterance'

import { IntentTrainInput, NoneableIntentClassifier, NoneableIntentPredictions } from './intent-classifier'

type Model = {
  intents: string[]
  exact_match_index: ExactMatchIndex
}

type ExactMatchIndex = _.Dictionary<{ intent: string }>

const EXACT_MATCH_STR_OPTIONS: UtteranceToStringOptions = {
  lowerCase: true,
  onlyWords: true,
  strategy: 'replace-entity-name'
}

export class ExactIntenClassifier implements NoneableIntentClassifier {
  private static _displayName = 'Exact Intent Classifier'
  private static _name = 'exact-matcher'

  private model: Model | undefined

  public get name() {
    return ExactIntenClassifier._name
  }

  public async train(trainInput: IntentTrainInput, progress: (p: number) => void) {
    const { intents } = trainInput
    const exact_match_index = this._buildExactMatchIndex(intents)

    this.model = {
      intents: intents.map((i) => i.name),
      exact_match_index
    }
    progress(1)
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

  public serialize(): Buffer {
    if (!this.model) {
      throw new Error(`${ExactIntenClassifier._displayName} must be trained before calling serialize.`)
    }
    return Buffer.from(JSON.stringify(this.model), 'utf8')
  }

  public async load(serialized: Buffer) {
    try {
      const model: Model = JSON.parse(Buffer.from(serialized).toString('utf8'))
      this.model = model
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(ExactIntenClassifier._displayName, err)
    }
  }

  public async predict(utterance: Utterance): Promise<NoneableIntentPredictions> {
    if (!this.model) {
      throw new Error(`${ExactIntenClassifier._displayName} must be trained before calling predict.`)
    }

    const { exact_match_index, intents: intentNames } = this.model

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
