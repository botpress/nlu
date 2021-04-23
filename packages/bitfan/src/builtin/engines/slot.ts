import * as sdk from 'bitfan/sdk'
import _ from 'lodash'

import { StanProvider } from '../../services/bp-provider/stan-provider'
import {
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition,
  TrainInput
} from '../../services/bp-provider/stan-typings'

const MAIN_TOPIC = 'main'
const MAIN_INTENT = 'main'

const BATCH_SIZE = 10

export class BpSlotEngine implements sdk.Engine<'slot'> {
  private _stanProvider: StanProvider

  constructor(bpEndpoint?: string, password?: string) {
    this._stanProvider = new StanProvider(bpEndpoint, password)
  }

  train(trainSet: sdk.DataSet<'slot'>, seed: number, progress: sdk.ProgressCb) {
    const { enums, patterns, lang, samples, variables } = trainSet

    const utterances = samples.map(r => {
      const { text, label } = r

      let sanitized = `${text}`
      let addedLength = 0
      for (const l of label) {
        const beforeSlot = sanitized.slice(0, l.start + addedLength)
        const slot = sanitized.slice(l.start + addedLength, l.end + addedLength)
        const afterSlot = sanitized.slice(l.end + addedLength, sanitized.length)
        const markdown = `[${slot}](${l.name})`

        addedLength += markdown.length - slot.length
        sanitized = beforeSlot + markdown + afterSlot
      }

      return sanitized
    })

    const trainInput: TrainInput = {
      entities: [...enums.map(this._mapEnums), ...patterns.map(this._mapPatterns)],
      language: lang,
      seed,
      contexts: [MAIN_TOPIC],
      intents: [
        {
          name: MAIN_INTENT,
          contexts: [MAIN_TOPIC],
          slots: variables.map(this._mapVariable) || [],
          utterances
        }
      ]
    }

    return this._stanProvider.train(trainInput, (_time, progressPercent) => {
      progress(progressPercent)
    })
  }

  private _mapEnums(e: sdk.Enum): ListEntityDefinition {
    const { fuzzy, name, values } = e
    return {
      fuzzy,
      name,
      type: 'list',
      values
    }
  }

  private _mapPatterns(p: sdk.Pattern): PatternEntityDefinition {
    const { case_sensitive, name, regex } = p
    return {
      case_sensitive,
      examples: [],
      name,
      regex,
      type: 'pattern'
    }
  }

  private _mapVariable(s: sdk.Variable): SlotDefinition {
    const { name, types } = s
    return {
      name,
      entities: types
    }
  }

  async predict(testSet: sdk.DataSet<'slot'>, progress: sdk.ProgressCb) {
    const results: sdk.Prediction<'slot'>[] = []

    let done = 0

    for (const batch of _.chunk(testSet.samples, BATCH_SIZE)) {
      const predictions = await this._stanProvider.predict(batch.map(r => r.text))

      for (const { pred, row } of _.zipWith(predictions, batch, (pred, row) => ({ pred, row }))) {
        const { text, label } = row
        const { intents } = pred!.contexts.find(c => c.name === MAIN_TOPIC)!
        const mainIntent = intents.find(i => i.name === MAIN_INTENT)

        const candidates: sdk.Candidate<'slot'>[] = mainIntent!.slots.map(({ name, start, end, confidence }) => ({
          elected: { name, start, end },
          confidence
        }))

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
}
