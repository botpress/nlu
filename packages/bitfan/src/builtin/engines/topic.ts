import { ContextPrediction, TrainInput } from '@botpress/nlu-types'
import * as sdk from 'bitfan/sdk'
import _ from 'lodash'
import { areSame, makeKey, OOS } from '../../builtin/labels'

import { StanProvider } from '../../services/bp-provider/stan-provider'

const BATCH_SIZE = 10

export class BpTopicEngine implements sdk.Engine<'topic'> {
  private _stanProvider: StanProvider

  constructor(bpEndpoint: string, password: string) {
    this._stanProvider = new StanProvider(bpEndpoint)
  }

  train(trainSet: sdk.DataSet<'topic'>, seed: number, progress: sdk.ProgressCb) {
    const samples = trainSet.samples

    const allTopics = _(samples)
      .map((r) => r.label)
      .uniqWith(areSame)
      .value()

    const intents = _.flatMap(allTopics, (t) => {
      const samplesOfTopic = samples.filter((s) => areSame(s.label, t))

      return [
        {
          name: this._makeIntenName(t),
          contexts: [makeKey(t)],
          slots: [],
          utterances: samplesOfTopic.map((s) => s.text)
        }
      ]
    })

    const trainInput: TrainInput = {
      language: trainSet.lang,
      entities: [],
      seed,
      intents
    }

    return this._stanProvider.train(trainInput, (_time, progressPercent) => {
      progress(progressPercent)
    })
  }

  async predict(testSet: sdk.DataSet<'topic'>, progress: sdk.ProgressCb) {
    const results: sdk.Prediction<'topic'>[] = []

    let done = 0

    for (const batch of _.chunk(testSet.samples, BATCH_SIZE)) {
      const predictions = await this._stanProvider.predict(batch.map((r) => r.text))

      for (const [pred, row] of _.zip(predictions, batch)) {
        const { text, label } = row!

        let mostConfidentTopic: ContextPrediction | undefined

        const candidates: sdk.Candidate<'topic'>[] = []
        for (const topicLabel of Object.keys(pred!)) {
          const topic = pred!.contexts.find((c) => c.name === topicLabel)!

          candidates.push({
            elected: topicLabel,
            confidence: topic.confidence
          })

          if (!mostConfidentTopic || mostConfidentTopic.confidence < topic.confidence) {
            mostConfidentTopic = topic
          }
        }

        candidates.push({
          elected: OOS,
          confidence: mostConfidentTopic!.oos
        })

        results.push({
          text,
          label,
          candidates
        })

        progress(done++ / testSet.samples.length)
      }
    }
    return results
  }

  private _makeIntenName(topic: sdk.Label<'topic'>) {
    return `${makeKey(topic)}-intent`
  }
}
