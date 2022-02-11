import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelOf } from 'src/component'
import { ModelLoadingError } from '../../errors'
import * as MLToolkit from '../../ml/toolkit'
import { Logger } from '../../typings'
import { ListEntityModel, PatternEntity, Tools } from '../typings'
import Utterance from '../utterance/utterance'

import { IntentClassifier, IntentPredictions, IntentTrainInput } from './intent-classifier'

type Featurizer = (u: Utterance, entities: string[]) => number[]
type Model = {
  svmModel: ModelOf<MLToolkit.SVM.Classifier> | undefined
  intentNames: string[]
  entitiesName: string[]
}

const PTBSvmIntentModel = new ptb.PTBMessage('SvmIntentModel', {
  svmModel: { type: MLToolkit.SVM.Classifier.modelType, id: 1, rule: 'optional' },
  intentNames: { type: 'string', id: 2, rule: 'repeated' },
  entitiesName: { type: 'string', id: 3, rule: 'repeated' }
})

type Predictors = {
  svm: MLToolkit.SVM.Classifier | undefined
  intentNames: string[]
  entitiesName: string[]
}

export class SvmIntentClassifier implements IntentClassifier<ptb.Infer<typeof PTBSvmIntentModel>> {
  private static _displayName = 'SVM Intent Classifier'
  private static _name = 'svm-classifier'

  private predictors: Predictors | undefined

  constructor(private tools: Tools, private featurizer: Featurizer, private _logger: Logger) {}

  public get name() {
    return SvmIntentClassifier._name
  }

  public static get modelType() {
    return PTBSvmIntentModel
  }

  public async train(
    input: IntentTrainInput,
    progress: (p: number) => void
  ): Promise<ptb.Infer<typeof PTBSvmIntentModel>> {
    const { intents, nluSeed, list_entities, pattern_entities } = input

    const entitiesName = this._getEntitiesName(list_entities, pattern_entities)

    const points = _(intents)
      .flatMap(({ utterances, name }) => {
        return utterances.map((utt) => ({
          label: name,
          coordinates: this.featurizer(utt, entitiesName)
        }))
      })
      .filter((x) => x.coordinates.filter(isNaN).length === 0)
      .value()

    const classCount = _.uniqBy(points, (p) => p.label).length
    if (points.length === 0 || classCount <= 1) {
      this._logger.debug('No SVM to train because there is less than two classes.')
      progress(1)
      return {
        svmModel: undefined,
        intentNames: intents.map((i) => i.name),
        entitiesName
      }
    }

    const svm = new this.tools.mlToolkit.SVM.Classifier(this._logger)

    const options: MLToolkit.SVM.SVMOptions = { kernel: 'LINEAR', classifier: 'C_SVC', seed: nluSeed }
    const svmModel = await svm.train({ points, options }, progress)

    return {
      svmModel,
      intentNames: intents.map((i) => i.name),
      entitiesName
    }
  }

  public async load(serialized: ptb.Infer<typeof PTBSvmIntentModel>): Promise<void> {
    try {
      const { entitiesName, intentNames, svmModel } = serialized
      const model: Model = {
        svmModel,
        entitiesName: entitiesName ?? [],
        intentNames: intentNames ?? []
      }

      this.predictors = await this._makePredictors(model)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(SvmIntentClassifier._displayName, err)
    }
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    const { svmModel, intentNames, entitiesName } = model
    const svm = svmModel ? await this._makeSvmClf(svmModel) : undefined
    return {
      svm,
      intentNames,
      entitiesName
    }
  }

  private async _makeSvmClf(svmModel: ModelOf<MLToolkit.SVM.Classifier>): Promise<MLToolkit.SVM.Classifier> {
    const svm = new this.tools.mlToolkit.SVM.Classifier(this._logger)
    await svm.load(svmModel)
    return svm
  }

  public async predict(utterance: Utterance): Promise<IntentPredictions> {
    if (!this.predictors) {
      throw new Error(`${SvmIntentClassifier._displayName} must load model before calling predict.`)
    }

    const { svm, intentNames, entitiesName } = this.predictors
    if (!svm) {
      if (intentNames.length <= 0) {
        return {
          intents: []
        }
      }

      const intent = intentNames[0]
      return {
        intents: [{ name: intent, confidence: 1, extractor: 'svm-classifier' }]
      }
    }

    const features = this.featurizer(utterance, entitiesName)
    const preds = await svm.predict(features)

    return {
      intents: preds.map(({ label, confidence }) => ({ name: label, confidence, extractor: 'svm-classifier' }))
    }
  }

  private _getEntitiesName(list_entities: ListEntityModel[], pattern_entities: PatternEntity[]) {
    return [...list_entities.map((e) => e.entityName), ...pattern_entities.map((e) => e.name)]
  }
}
