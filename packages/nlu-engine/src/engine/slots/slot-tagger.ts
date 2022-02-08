import _ from 'lodash'
import { Logger } from 'src/typings'
import { ModelLoadingError } from '../../errors'
import { MLToolkit } from '../../ml/typings'
import { getEntitiesAndVocabOfIntent } from '../intents/intent-vocab'

import { Intent, ListEntityModel, SlotExtractionResult, Tools, SlotDefinition } from '../typings'
import Utterance, { UtteranceToken } from '../utterance/utterance'

import * as featurizer from './slot-featurizer'
import { deserializeModel, IntentSlotFeatures, Model, serializeModel } from './slot-tagger-model'
import {
  labelizeUtterance,
  makeExtractedSlots,
  predictionLabelToTagResult,
  removeInvalidTagsForIntent
} from './slot-tagger-utils'

const CRF_TRAINER_PARAMS = {
  c1: '0.0001',
  c2: '0.01',
  max_iterations: '500',
  'feature.possible_transitions': '1',
  'feature.possible_states': '1'
}

type TrainInput = {
  intent: Intent<Utterance>
  list_entites: ListEntityModel[]
}

type Predictors = {
  crfTagger: MLToolkit.CRF.Tagger | undefined
  intentFeatures: IntentSlotFeatures
  slot_definitions: SlotDefinition[]
}

export default class SlotTagger {
  private static _name = 'CRF Slot Tagger'

  private model: Model | undefined
  private predictors: Predictors | undefined
  private mlToolkit: typeof MLToolkit

  constructor(tools: Tools, private logger: Logger) {
    this.mlToolkit = tools.mlToolkit
  }

  public serialize(): Buffer {
    if (!this.model) {
      throw new Error(`${SlotTagger._name} must be trained before calling serialize.`)
    }
    return serializeModel(this.model)
  }

  public load = async (serialized: Buffer) => {
    try {
      const model = deserializeModel(serialized)
      this.predictors = await this._makePredictors(model)
      this.model = model
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(SlotTagger._name, err)
    }
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    const { intentFeatures, crfModel, slot_definitions } = model
    const crfTagger = crfModel && !!crfModel.length ? await this._makeCrfTagger(crfModel) : undefined
    return {
      crfTagger,
      intentFeatures,
      slot_definitions
    }
  }

  private async _makeCrfTagger(crfModel: Buffer) {
    const crfTagger = new this.mlToolkit.CRF.Tagger()
    await crfTagger.initialize()
    crfTagger.open(crfModel)
    return crfTagger
  }

  public async train(trainSet: TrainInput, progress: (p: number) => void): Promise<void> {
    const { intent, list_entites } = trainSet
    const intentFeatures = getEntitiesAndVocabOfIntent(intent, list_entites)
    const { slot_definitions } = intent

    if (slot_definitions.length <= 0) {
      this.model = {
        crfModel: undefined,
        intentFeatures,
        slot_definitions
      }
      progress(1)
      return
    }

    const elements: MLToolkit.CRF.DataPoint[] = []

    for (const utterance of intent.utterances) {
      const features: string[][] = utterance.tokens
        .filter((x) => !x.isSpace)
        .map(this.tokenSliceFeatures.bind(this, intentFeatures, utterance, false))
      const labels = labelizeUtterance(utterance)

      elements.push({ features, labels })
    }

    const trainer = new this.mlToolkit.CRF.Trainer(this.logger)
    await trainer.initialize()
    const dummyProgress = () => {}
    const crfModel = await trainer.train(elements, CRF_TRAINER_PARAMS, dummyProgress)

    this.model = {
      crfModel,
      intentFeatures,
      slot_definitions
    }

    progress(1)
  }

  private tokenSliceFeatures(
    intent: IntentSlotFeatures,
    utterance: Utterance,
    isPredict: boolean,
    token: UtteranceToken
  ): string[] {
    const previous = utterance.tokens.filter((t) => t.index < token.index && !t.isSpace).slice(-2)
    const next = utterance.tokens.filter((t) => t.index > token.index && !t.isSpace).slice(0, 1)

    const prevFeats = previous.map((t) =>
      this._getTokenFeatures(intent, utterance, t, isPredict)
        .filter((f) => f.name !== 'quartile')
        .reverse()
    )
    const current = this._getTokenFeatures(intent, utterance, token, isPredict).filter((f) => f.name !== 'cluster')
    const nextFeats = next.map((t) =>
      this._getTokenFeatures(intent, utterance, t, isPredict).filter((f) => f.name !== 'quartile')
    )

    const prevPairs = prevFeats.length
      ? featurizer.getFeatPairs(prevFeats[0], current, ['word', 'vocab', 'weight', 'POS'])
      : []
    const nextPairs = nextFeats.length
      ? featurizer.getFeatPairs(current, nextFeats[0], ['word', 'vocab', 'weight', 'POS'])
      : []

    const intentFeat = featurizer.getIntentFeature(intent.name)
    const bos = token.isBOS ? ['__BOS__'] : []
    const eos = token.isEOS ? ['__EOS__'] : []

    return [
      ...bos,
      featurizer.featToCRFsuiteAttr('', intentFeat),
      ..._.flatten(prevFeats.map((feat, idx) => feat.map(featurizer.featToCRFsuiteAttr.bind(this, `w[-${idx + 1}]`)))),
      ...current.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[0]')),
      ..._.flatten(nextFeats.map((feat, idx) => feat.map(featurizer.featToCRFsuiteAttr.bind(this, `w[${idx + 1}]`)))),
      ...prevPairs.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[-1]|w[0]')),
      ...nextPairs.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[0]|w[1]')),
      ...eos
    ] as string[]
  }

  private _getTokenFeatures(
    intent: IntentSlotFeatures,
    utterance: Utterance,
    token: UtteranceToken,
    isPredict: boolean
  ): featurizer.CRFFeature[] {
    if (!token || !token.value) {
      return []
    }

    return [
      featurizer.getTokenQuartile(utterance, token),
      featurizer.getClusterFeat(token),
      featurizer.getWordWeight(token),
      featurizer.getInVocabFeat(token, intent.vocab),
      featurizer.getSpaceFeat(utterance.tokens[token.index - 1]),
      featurizer.getAlpha(token),
      featurizer.getNum(token),
      featurizer.getSpecialChars(token),
      featurizer.getWordFeat(token, isPredict),
      featurizer.getPOSFeat(token),
      ...featurizer.getEntitiesFeats(token, intent.slot_entities ?? [], isPredict)
    ].filter(_.identity) as featurizer.CRFFeature[] // some features can be undefined
  }

  private _getSequenceFeatures(intent: IntentSlotFeatures, utterance: Utterance, isPredict: boolean): string[][] {
    return _.chain(utterance.tokens)
      .filter((t) => !t.isSpace)
      .map((t) => this.tokenSliceFeatures(intent, utterance, isPredict, t))
      .value()
  }

  public async predict(utterance: Utterance): Promise<SlotExtractionResult[]> {
    if (!this.predictors) {
      if (!this.model) {
        throw new Error(`${SlotTagger._name} must be trained before calling predict.`)
      }

      this.predictors = await this._makePredictors(this.model)
    }

    const { intentFeatures, crfTagger, slot_definitions } = this.predictors

    if (!crfTagger) {
      return []
    }

    const features = this._getSequenceFeatures(intentFeatures, utterance, true)

    const predictions = crfTagger.marginal(features)

    return _.chain(predictions)
      .map(predictionLabelToTagResult)
      .map((tagRes) => removeInvalidTagsForIntent(slot_definitions, tagRes))
      .thru((tagRess) => makeExtractedSlots(intentFeatures.slot_entities, utterance, tagRess))
      .value() as SlotExtractionResult[]
  }
}
