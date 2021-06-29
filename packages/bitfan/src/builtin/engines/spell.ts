import { TrainInput, IntentDefinition } from '@botpress/nlu-client'
import * as sdk from 'bitfan/sdk'
import _ from 'lodash'

import { StanProvider } from '../../services/bp-provider/stan-provider'

const MAIN_TOPIC = 'main'
const MAIN_INTENT = 'main'

const BATCH_SIZE = 10

export class BpSpellingEngine implements sdk.UnsupervisedEngine<'spell'> {
  private _stanProvider: StanProvider

  constructor(bpEndpoint?: string, password?: string) {
    this._stanProvider = new StanProvider(bpEndpoint, password)
  }

  train(corpus: sdk.Document[], seed: number, progress: sdk.ProgressCb) {
    if (!corpus.length) {
      throw new Error('Botpress Spelling Engine needs at least one document for training.')
    }

    const dummyIntent: IntentDefinition = {
      name: MAIN_INTENT,
      contexts: [MAIN_TOPIC],
      utterances: corpus
        .map((c) => c.text)
        .join('\n')
        .split('\n'),
      slots: []
    }

    const trainInput: TrainInput = {
      language: corpus[0].lang,
      entities: [],
      seed,
      intents: [dummyIntent]
    }

    return this._stanProvider.train(trainInput, (_time, progressPercent) => {
      progress(progressPercent)
    })
  }

  async predict(testSet: sdk.DataSet<'spell'>, progress: sdk.ProgressCb) {
    const results: sdk.Prediction<'spell'>[] = []

    let done = 0

    for (const batch of _.chunk(testSet.samples, BATCH_SIZE)) {
      const predictions = (await this._stanProvider.predict(batch.map((r) => r.text))).map((p) => p.spellChecked)

      for (const [pred, row] of _.zip(predictions, batch)) {
        const { text, label } = row!
        const candidate: sdk.Candidate<'spell'> = {
          elected: pred ?? text,
          confidence: 1
        }

        results.push({
          text,
          label,
          candidates: [candidate]
        })

        progress(done++ / testSet.samples.length)
      }
    }
    return results
  }
}
