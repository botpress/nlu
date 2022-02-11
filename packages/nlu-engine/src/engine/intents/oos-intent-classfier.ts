import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelOf } from 'src/component'
import { ModelLoadingError } from '../../errors'
import * as MLToolkit from '../../ml/toolkit'
import { Logger } from '../../typings'
import { isPOSAvailable } from '../language/pos-tagger'
import { vocabNGram } from '../tools/strings'
import { SMALL_TFIDF } from '../tools/tfidf'
import { SPACE } from '../tools/token-utils'
import { Intent, Tools } from '../typings'
import Utterance, { buildUtteranceBatch } from '../utterance/utterance'

import { ExactIntenClassifier } from './exact-intent-classifier'
import { NoneableIntentClassifier, NoneableIntentPredictions, NoneableIntentTrainInput } from './intent-classifier'
import { getIntentFeatures } from './intent-featurizer'
import { featurizeInScopeUtterances, featurizeOOSUtterances, getUtteranceFeatures } from './out-of-scope-featurizer'
import { SvmIntentClassifier } from './svm-intent-classifier'

const JUNK_VOCAB_SIZE = 500
const JUNK_TOKEN_MIN = 1
const JUNK_TOKEN_MAX = 20

type Model = {
  trainingVocab: string[]
  baseIntentClfModel: ModelOf<SvmIntentClassifier>
  oosSvmModel: ModelOf<MLToolkit.SVM.Classifier> | undefined
  exactMatchModel: ModelOf<ExactIntenClassifier>
}

const PTBOOSIntentModel = new ptb.PTBMessage('OOSIntentModel', {
  trainingVocab: { type: 'string', id: 1, rule: 'repeated' },
  baseIntentClfModel: { type: SvmIntentClassifier.modelType, id: 2 },
  oosSvmModel: { type: MLToolkit.SVM.Classifier.modelType, id: 3, rule: 'optional' },
  exactMatchModel: { type: ExactIntenClassifier.modelType, id: 4 }
})

type Predictors = {
  baseIntentClf: SvmIntentClassifier
  oosSvm: MLToolkit.SVM.Classifier | undefined
  trainingVocab: string[]
  exactIntenClassifier: ExactIntenClassifier
}

const MIN_NB_UTTERANCES = 3
const NONE_INTENT = 'none'
const NONE_UTTERANCES_BOUNDS = {
  MIN: 20,
  MAX: 200
}

/**
 * @description Intent classfier composed of 3 smaller components:
 *  1 - an SVM intent classifier
 *  2 - an SVM to predict weither the sample is in scope or oos
 *  3 - an exact-matcher to override the prediction made by the SVM when there's an exact match
 *
 * @returns A confidence level for all possible labels including none
 */
export class OOSIntentClassifier implements NoneableIntentClassifier<ptb.Infer<typeof PTBOOSIntentModel>> {
  private static _displayName = 'OOS Intent Classifier'
  private static _name = 'classifier'
  private predictors: Predictors | undefined

  constructor(private tools: Tools, private _logger: Logger) {}

  public get name() {
    return OOSIntentClassifier._name
  }

  public static get modelType() {
    return PTBOOSIntentModel
  }

  public async train(
    trainInput: NoneableIntentTrainInput,
    progress: (p: number) => void
  ): Promise<ptb.Infer<typeof PTBOOSIntentModel>> {
    const { languageCode, allUtterances } = trainInput
    const noneIntent = await this._makeNoneIntent(allUtterances, languageCode)

    let ooScopeProgress = 0
    let inScopeProgress = 0
    const reportCombinedProgres = () => {
      const combinedProgres = (ooScopeProgress + inScopeProgress) / 2
      progress(combinedProgres)
    }

    const [ooScopeModel, inScopeModel] = await Promise.all([
      this._trainOOScopeSvm(trainInput, noneIntent, (p: number) => {
        ooScopeProgress = p
        reportCombinedProgres()
      }),
      this._trainInScopeSvm(trainInput, noneIntent, (p: number) => {
        inScopeProgress = p
        reportCombinedProgres()
      })
    ])

    const exactIntenClassifier = new ExactIntenClassifier()
    const dummyProgress = () => {}
    const exactMatchModel = await exactIntenClassifier.train(trainInput, dummyProgress)

    return {
      oosSvmModel: ooScopeModel,
      baseIntentClfModel: inScopeModel,
      trainingVocab: this.getVocab(trainInput.allUtterances),
      exactMatchModel
    }
  }

  private _makeNoneIntent = async (allUtterances: Utterance[], languageCode: string): Promise<Intent<Utterance>> => {
    const allTokens = _.flatMap(allUtterances, (u) => u.tokens)

    const vocab = _(allTokens)
      .map((t) => t.toString({ lowerCase: true }))
      .uniq()
      .value()

    const lo = this.tools.seededLodashProvider.getSeededLodash()

    const junkWords = this.generateSimilarJunkWords(vocab)
    const avgTokens = lo.meanBy(allUtterances, (x) => x.tokens.length)
    const nbOfNoneUtterances = lo.clamp(
      (allUtterances.length * 2) / 3,
      NONE_UTTERANCES_BOUNDS.MIN,
      NONE_UTTERANCES_BOUNDS.MAX
    )
    const stopWords = await this.tools.getStopWordsForLang(languageCode)
    const vocabWords = lo(allTokens)
      .filter((t) => t.tfidf <= SMALL_TFIDF)
      .map((t) => t.toString({ lowerCase: true }))
      .uniq()
      .orderBy((t) => t)
      .value()

    const joinChar = this.tools.isSpaceSeparated(languageCode) ? SPACE : ''

    const vocabUtts = lo.range(0, nbOfNoneUtterances).map(() => {
      const nbWords = Math.round(lo.random(1, avgTokens * 2, false))
      return lo.sampleSize(lo.uniq([...stopWords, ...vocabWords]), nbWords).join(joinChar)
    })

    const junkWordsUtts = lo.range(0, nbOfNoneUtterances).map(() => {
      const nbWords = Math.round(lo.random(1, avgTokens * 2, false))
      return lo.sampleSize(junkWords, nbWords).join(joinChar)
    })

    const mixedUtts = lo.range(0, nbOfNoneUtterances).map(() => {
      const nbWords = Math.round(lo.random(1, avgTokens * 2, false))
      return lo.sampleSize([...junkWords, ...stopWords], nbWords).join(joinChar)
    })

    return <Intent<Utterance>>{
      name: NONE_INTENT,
      slot_definitions: [],
      utterances: await buildUtteranceBatch(
        [...mixedUtts, ...vocabUtts, ...junkWordsUtts, ...stopWords],
        languageCode,
        this.tools
      ),
      contexts: []
    }
  }

  private generateSimilarJunkWords(subsetVocab: string[]) {
    const gramset = vocabNGram(subsetVocab)

    const realWords = _.uniq(subsetVocab)
    const meanWordSize = _.meanBy(realWords, (w) => w.length)
    const minJunkSize = Math.max(JUNK_TOKEN_MIN, meanWordSize / 2) // Twice as short
    const maxJunkSize = Math.min(JUNK_TOKEN_MAX, meanWordSize * 1.5) // A bit longer.  Those numbers are discretionary and are not expected to make a big impact on the models.
    const lo = this.tools.seededLodashProvider.getSeededLodash()

    const junks = _.range(0, JUNK_VOCAB_SIZE).map(() => {
      const finalSize = lo.random(minJunkSize, maxJunkSize, false)
      let word = ''
      while (word.length < finalSize) {
        word += lo.sample(gramset)
      }
      return word
    }) // randomly generated words

    return junks
  }

  private async _trainOOScopeSvm(
    trainInput: NoneableIntentTrainInput,
    noneIntent: Omit<Intent<Utterance>, 'contexts'>,
    progress: (p: number) => void
  ): Promise<ModelOf<MLToolkit.SVM.Classifier> | undefined> {
    const { allUtterances, nluSeed, intents, languageCode } = trainInput

    const trainingOptions: MLToolkit.SVM.SVMOptions = {
      c: [10], // so there's no grid search
      kernel: 'LINEAR',
      classifier: 'C_SVC',
      seed: nluSeed
    }

    const noneUtts = noneIntent.utterances

    if (!isPOSAvailable(languageCode) || noneUtts.length === 0) {
      this._logger.debug('Cannot train OOS svm because there is no training data.')
      progress(1)
      return
    }

    const vocab = this.getVocab(allUtterances)
    const oos_points = featurizeOOSUtterances(noneUtts, vocab, this.tools)

    const in_scope_points = _.chain(intents)
      .filter((i) => i.name !== NONE_INTENT)
      .flatMap((i) => featurizeInScopeUtterances(i.utterances, i.name))
      .value()

    const svm = new this.tools.mlToolkit.SVM.Classifier(this._logger)

    const points = [...in_scope_points, ...oos_points]
    const model = await svm.train({ points, options: trainingOptions }, progress)
    return model
  }

  private async _trainInScopeSvm(
    trainInput: NoneableIntentTrainInput,
    noneIntent: Omit<Intent<Utterance>, 'contexts'>,
    progress: (p: number) => void
  ) {
    const baseIntentClf = new SvmIntentClassifier(this.tools, getIntentFeatures, this._logger)
    const noneUtts = noneIntent.utterances.filter((u) => u.tokens.filter((t) => t.isWord).length >= 3)

    const trainableIntents = trainInput.intents.filter(
      (i) => i.name !== NONE_INTENT && i.utterances.length >= MIN_NB_UTTERANCES
    )
    const nAvgUtts = Math.ceil(_.meanBy(trainableIntents, (i) => i.utterances.length))

    const lo = this.tools.seededLodashProvider.getSeededLodash()

    const intents: Intent<Utterance>[] = [
      ...trainableIntents,
      {
        name: NONE_INTENT,
        utterances: lo
          .chain(noneUtts)
          .shuffle()
          .take(nAvgUtts * 2.5) // undescriptible magic n, no sens to extract constant
          .value(),
        contexts: [],
        slot_definitions: []
      }
    ]

    return baseIntentClf.train({ ...trainInput, intents }, progress)
  }

  private getVocab(utts: Utterance[]) {
    return _.flatMap(utts, (u) => u.tokens.map((t) => t.toString({ lowerCase: true })))
  }

  public async load(serialized: ptb.Infer<typeof PTBOOSIntentModel>): Promise<void> {
    try {
      const { baseIntentClfModel, exactMatchModel, oosSvmModel, trainingVocab } = serialized
      const model: Model = {
        baseIntentClfModel,
        exactMatchModel,
        oosSvmModel,
        trainingVocab: trainingVocab ?? []
      }
      this.predictors = await this._makePredictors(model)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(OOSIntentClassifier._displayName, err)
    }
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    const { oosSvmModel, baseIntentClfModel, trainingVocab, exactMatchModel } = model

    const baseIntentClf = new SvmIntentClassifier(this.tools, getIntentFeatures, this._logger)
    await baseIntentClf.load(baseIntentClfModel)

    const exactIntenClassifier = new ExactIntenClassifier()
    await exactIntenClassifier.load(exactMatchModel)

    const svm = new this.tools.mlToolkit.SVM.Classifier(this._logger)
    const oosSvm = oosSvmModel ? await this._makeSvmClf(oosSvmModel) : undefined

    return {
      oosSvm,
      baseIntentClf,
      trainingVocab,
      exactIntenClassifier
    }
  }

  private async _makeSvmClf(svmModel: ModelOf<MLToolkit.SVM.Classifier>): Promise<MLToolkit.SVM.Classifier> {
    const svm = new this.tools.mlToolkit.SVM.Classifier(this._logger)
    await svm.load(svmModel)
    return svm
  }

  public async predict(utterance: Utterance): Promise<NoneableIntentPredictions> {
    if (!this.predictors) {
      throw new Error(`${OOSIntentClassifier._displayName} must load model before calling predict.`)
    }

    const { oosSvm, baseIntentClf, trainingVocab, exactIntenClassifier } = this.predictors

    const svmPredictions = await baseIntentClf.predict(utterance)

    const exactPredictions = await exactIntenClassifier.predict(utterance)

    let oosPrediction = 0
    if (oosSvm) {
      const feats = getUtteranceFeatures(utterance, trainingVocab)
      try {
        const preds = await oosSvm.predict(feats)
        oosPrediction =
          _.chain(preds)
            .filter((p) => p.label.startsWith('out'))
            .maxBy((p) => p.confidence)
            .value()?.confidence || 0
      } catch (err) {}
    }

    if (exactPredictions.oos === 0) {
      return exactPredictions
    }
    return OOSIntentClassifier._removeNoneIntent({
      intents: svmPredictions.intents,
      oos: oosPrediction
    })
  }

  public static _removeNoneIntent(preds: NoneableIntentPredictions): NoneableIntentPredictions {
    const noneIdx = preds.intents.findIndex((i) => i.name === NONE_INTENT)
    if (noneIdx < 0) {
      return preds
    }
    const none = preds.intents[noneIdx]
    preds.intents.splice(noneIdx, 1)
    preds.oos = Math.max(none.confidence, preds.oos)
    return this._adjustTotalConfidenceTo100(preds)
  }

  private static _adjustTotalConfidenceTo100 = (preds: NoneableIntentPredictions): NoneableIntentPredictions => {
    const totalConfidence = preds.oos + _.sum(preds.intents.map((i) => i.confidence))
    preds.oos = preds.oos / totalConfidence
    preds.intents = preds.intents.map((i) => ({ ...i, confidence: i.confidence / totalConfidence }))
    return preds
  }
}
