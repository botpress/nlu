import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { ModelLoadingError } from '../../errors'
import * as MLToolkit from '../../ml/toolkit'
import { Logger } from '../../typings'
import { ListEntityModel, PatternEntity, Tools } from '../typings'
import Utterance from '../utterance/utterance'

import { IntentClassifier, IntentPredictions, IntentTrainInput } from './intent-classifier'

type Featurizer = (u: Utterance, entities: string[]) => number[]
type Model = {
  svmModel: Buffer | undefined
  intentNames: string[]
  entitiesName: string[]
}

const PTBSvmIntentModel = new ptb.PTBMessage('SvmIntentModel', {
  svmModel: { type: 'bytes', id: 1, rule: 'optional' },
  intentNames: { type: 'string', id: 2, rule: 'repeated' },
  entitiesName: { type: 'string', id: 3, rule: 'repeated' }
})

type Predictors = {
  svm: MLToolkit.SVM.IPredictor | undefined
  intentNames: string[]
  entitiesName: string[]
}

export class SvmIntentClassifier implements IntentClassifier {
  private static _displayName = 'SVM Intent Classifier'
  private static _name = 'svm-classifier'

  private model: Model | undefined
  private predictors: Predictors | undefined

  constructor(private tools: Tools, private featurizer: Featurizer, private _logger: Logger) {}

  public get name() {
    return SvmIntentClassifier._name
  }

  public async train(input: IntentTrainInput, progress: (p: number) => void): Promise<void> {
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
      this.model = {
        svmModel: undefined,
        intentNames: intents.map((i) => i.name),
        entitiesName
      }
      progress(1)
      return
    }

    const svmModel = await this.tools.mlToolkit.SVM.Trainer.train(
      points,
      { kernel: 'LINEAR', classifier: 'C_SVC', seed: nluSeed },
      this._logger,
      progress
    )

    this.model = {
      svmModel,
      intentNames: intents.map((i) => i.name),
      entitiesName
    }
  }

  public serialize(): Buffer {
    if (!this.model) {
      throw new Error(`${SvmIntentClassifier._displayName} must be trained before calling serialize.`)
    }
    const bin = PTBSvmIntentModel.encode(this.model)
    return Buffer.from(bin)
  }

  public async load(serialized: Buffer): Promise<void> {
    try {
      const { entitiesName, intentNames, svmModel } = PTBSvmIntentModel.decode(Buffer.from(serialized))
      const model: Model = {
        svmModel: svmModel && Buffer.from(svmModel),
        entitiesName: entitiesName ?? [],
        intentNames: intentNames ?? []
      }

      this.predictors = await this._makePredictors(model)
      this.model = model
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      throw new ModelLoadingError(SvmIntentClassifier._displayName, err)
    }
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    const { svmModel, intentNames, entitiesName } = model

    const svm = svmModel?.length ? await this.tools.mlToolkit.SVM.Predictor.create(Buffer.from(svmModel)) : undefined
    return {
      svm,
      intentNames,
      entitiesName
    }
  }

  public async predict(utterance: Utterance): Promise<IntentPredictions> {
    if (!this.predictors) {
      if (!this.model) {
        throw new Error(`${SvmIntentClassifier._displayName} must be trained before calling predict.`)
      }

      this.predictors = await this._makePredictors(this.model)
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
