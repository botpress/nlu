import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelOf, PipelineComponent } from 'src/component'
import { Logger } from 'src/typings'
import { ModelLoadingError } from '../../errors'
import * as MLToolkit from '../../ml/toolkit'
import { getEntitiesAndVocabOfIntent } from '../intents/intent-vocab'

import { Intent, ListEntityModel, SlotExtractionResult, Tools, SlotDefinition } from '../typings'
import Utterance, { UtteranceToken } from '../utterance/utterance'

import * as featurizer from './slot-featurizer'
import {
  labelizeUtterance,
  makeExtractedSlots,
  predictionLabelToTagResult,
  removeInvalidTagsForIntent
} from './slot-tagger-utils'
import { IntentSlotFeatures } from './typings'

const CRF_TRAINER_PARAMS = {
  c1: '0.0001',
  c2: '0.01',
  max_iterations: '500',
  'feature.possible_transitions': '1',
  'feature.possible_states': '1'
}

const PTBSlotDefinition = new ptb.PTBMessage('SlotDefinition', {
  name: { type: 'string', id: 1 },
  entities: { type: 'string', id: 2, rule: 'repeated' }
})

const PTBIntentSlotFeatures = new ptb.PTBMessage('IntentSlotFeatures', {
  name: { type: 'string', id: 1 },
  vocab: { type: 'string', id: 2, rule: 'repeated' },
  slot_entities: { type: 'string', id: 3, rule: 'repeated' }
})

const PTBSlotTaggerModel = new ptb.PTBMessage('SlotTaggerModel', {
  crfModel: { type: MLToolkit.CRF.Tagger.modelType, id: 1, rule: 'optional' },
  intentFeatures: { type: PTBIntentSlotFeatures, id: 2 },
  slot_definitions: { type: PTBSlotDefinition, id: 3, rule: 'repeated' }
})

type Model = {
  crfModel: ModelOf<MLToolkit.CRF.Tagger> | undefined
  intentFeatures: IntentSlotFeatures
  slot_definitions: SlotDefinition[]
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

export class SlotTagger
  implements PipelineComponent<TrainInput, ptb.Infer<typeof PTBSlotTaggerModel>, Utterance, SlotExtractionResult[]> {
  private static _displayName = 'CRF Slot Tagger'
  private static _name = 'crf-slot-tagger'

  private predictors: Predictors | undefined
  private mlToolkit: typeof MLToolkit

  public get name() {
    return SlotTagger._name
  }

  public static get modelType() {
    return PTBSlotTaggerModel
  }

  constructor(tools: Tools, private logger: Logger) {
    this.mlToolkit = tools.mlToolkit
  }

  public load = async (serialized: ptb.Infer<typeof PTBSlotTaggerModel>) => {
    try {
      const model = this.deserializeModel(serialized)
      this.predictors = await this._makePredictors(model)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(SlotTagger._displayName, err)
    }
  }

  private deserializeModel = (serialized: ptb.Infer<typeof PTBSlotTaggerModel>): Model => {
    const { crfModel, intentFeatures, slot_definitions } = serialized
    return {
      crfModel,
      intentFeatures: {
        ...intentFeatures,
        vocab: intentFeatures.vocab ?? [],
        slot_entities: intentFeatures.slot_entities ?? []
      },
      slot_definitions: slot_definitions ? slot_definitions.map(this.deserializeSlotDef) : []
    }
  }

  private deserializeSlotDef = (encoded: ptb.Infer<typeof PTBSlotDefinition>): SlotDefinition => {
    const { entities, name } = encoded
    return {
      name,
      entities: entities ?? []
    }
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    const { intentFeatures, crfModel, slot_definitions } = model
    const crfTagger = crfModel ? await this._makeCrfTagger(crfModel) : undefined
    return {
      crfTagger,
      intentFeatures,
      slot_definitions
    }
  }

  private async _makeCrfTagger(crfModel: ModelOf<MLToolkit.CRF.Tagger>) {
    const crfTagger = new this.mlToolkit.CRF.Tagger(this.logger)
    await crfTagger.load(crfModel)
    return crfTagger
  }

  public async train(
    trainSet: TrainInput,
    progress: (p: number) => void
  ): Promise<ptb.Infer<typeof PTBSlotTaggerModel>> {
    const { intent, list_entites } = trainSet
    const intentFeatures = getEntitiesAndVocabOfIntent(intent, list_entites)
    const { slot_definitions } = intent

    if (slot_definitions.length <= 0) {
      progress(1)
      return {
        crfModel: undefined,
        intentFeatures,
        slot_definitions
      }
    }

    const elements: MLToolkit.CRF.DataPoint[] = []

    for (const utterance of intent.utterances) {
      const features: string[][] = utterance.tokens
        .filter((x) => !x.isSpace)
        .map(this.tokenSliceFeatures.bind(this, intentFeatures, utterance, false))
      const labels = labelizeUtterance(utterance)

      elements.push({ features, labels })
    }

    const dummyProgress = () => {}
    const crf = new this.mlToolkit.CRF.Tagger(this.logger)
    const crfModel = await crf.train({ elements, options: CRF_TRAINER_PARAMS }, dummyProgress)
    progress(1)

    return {
      crfModel,
      intentFeatures,
      slot_definitions
    }
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
      throw new Error(`${SlotTagger._displayName} must load model before calling predict.`)
    }

    const { intentFeatures, crfTagger, slot_definitions } = this.predictors

    if (!crfTagger) {
      return []
    }

    const features = this._getSequenceFeatures(intentFeatures, utterance, true)

    const predictions = await crfTagger.marginal(features)

    return _.chain(predictions)
      .map(predictionLabelToTagResult)
      .map((tagRes) => removeInvalidTagsForIntent(slot_definitions, tagRes))
      .thru((tagRess) => makeExtractedSlots(intentFeatures.slot_entities, utterance, tagRess))
      .value() as SlotExtractionResult[]
  }
}
