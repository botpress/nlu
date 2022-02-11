import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'
import { PipelineComponent } from 'src/component'
import { Logger } from 'src/typings'
import { flattenMatrix, unflattenMatrix } from './flat-matrix'

import { SVM } from './libsvm'
import { Data, KernelTypes, Parameters, SvmModel, SvmTypes } from './libsvm/typings'
import { PTBSVMClassifierModel, PTBSVMClassifierParams } from './serialization'
import { SVMTrainInput, Prediction, TrainProgressCallback, SVMOptions } from './typings'

type Predictors = {
  clf: SVM
  labels: string[]
  parameters: Parameters
}

type Dic<T> = _.Dictionary<T>

type ComponentModel = ptb.Infer<typeof PTBSVMClassifierModel>

export class SVMClassifier
  implements PipelineComponent<SVMTrainInput, typeof PTBSVMClassifierModel, number[], Prediction[]> {
  private static _displayName = 'SVM Classifier'
  private static _name = 'svm-classifier'

  private _predictors: Predictors | undefined

  public get name() {
    return SVMClassifier._name
  }

  public static get modelType() {
    return PTBSVMClassifierModel
  }

  public get modelType() {
    return PTBSVMClassifierModel
  }

  constructor(protected logger: Logger) {}

  public async train(input: SVMTrainInput, callback: TrainProgressCallback | undefined): Promise<ComponentModel> {
    const { points, options } = input
    const vectorsLengths = _(points)
      .map((p) => p.coordinates.length)
      .uniq()
      .value()

    if (vectorsLengths.length > 1) {
      throw new Error('All vectors must be of the same size')
    }

    const labels = _(points)
      .map((p) => p.label)
      .uniq()
      .value()

    const dataset: Data[] = points.map((p) => [p.coordinates, labels.indexOf(p.label)])

    if (labels.length < 2) {
      throw new Error("SVM can't train on a dataset of only one class")
    }

    const arr = (n?: number | number[]) => (_.isNumber(n) ? [n] : n)
    const svm = new SVM(
      {
        svm_type: options && SvmTypes[options.classifier],
        kernel_type: options && KernelTypes[options.kernel],
        C: options && arr(options.c),
        gamma: options && arr(options.gamma),
        probability: options?.probability,
        reduce: options?.reduce,
        kFold: 4
      },
      this.logger
    )

    const seed = this._extractSeed(options)
    const trainResult = await svm.train(dataset, seed, (progress) => {
      if (callback && typeof callback === 'function') {
        callback(progress)
      }
    })
    svm.free()

    const { model } = trainResult
    const ser = this._serializeModel({ ...model, labels_idx: labels })
    return ser
  }

  private _serializeModel = (model: SvmModel & { labels_idx: string[] }): ptb.Infer<typeof PTBSVMClassifierModel> => {
    const { SV, sv_coef, u, mu, sigma, ...others } = model
    return {
      ...others,
      SV: flattenMatrix(SV),
      sv_coef: flattenMatrix(sv_coef),
      u: u && flattenMatrix(u),
      mu,
      sigma
    }
  }

  public load = async (serialized: ComponentModel) => {
    const { labels_idx: labels, ...model } = this._deserializeModel(serialized)
    const { param: parameters } = model
    const clf = new SVM({ kFold: 1 })
    await clf.initialize(model)
    this._predictors = {
      clf,
      labels,
      parameters
    }
  }

  private _deserializeModel = (model: ComponentModel): SvmModel & { labels_idx: string[] } => {
    const { SV, sv_coef, u, param, rho, probA, probB, sv_indices, label, nSV, labels_idx, ...others } = model
    return {
      param: this._deserializeParams(param),
      SV: unflattenMatrix(SV),
      sv_coef: unflattenMatrix(sv_coef),
      u: u && unflattenMatrix(u),
      rho: rho ?? [],
      probA: probA ?? [],
      probB: probB ?? [],
      sv_indices: sv_indices ?? [],
      label: label ?? [],
      nSV: nSV ?? [],
      labels_idx: labels_idx ?? [],
      ...others
    }
  }

  private _deserializeParams = (params: ptb.Infer<typeof PTBSVMClassifierParams>): Parameters => {
    const { weight_label, weight, ...others } = params
    return {
      weight_label: weight_label ?? [],
      weight: weight ?? [],
      ...others
    }
  }

  public async predict(coordinates: number[]): Promise<Prediction[]> {
    if (!this._predictors) {
      throw new Error(`${SVMClassifier._displayName} must load model before calling predict.`)
    }

    if (this._predictors.parameters.probability) {
      return this._predictProb(this._predictors, coordinates)
    } else {
      return this._predictOne(this._predictors, coordinates)
    }
  }

  private async _predictProb(preds: Predictors, coordinates: number[]): Promise<Prediction[]> {
    const results = await preds.clf.predictProbabilities(coordinates)

    const idexes = _.range(results.length)
    const reducedResults = _.reduce(
      idexes,
      (acc: Dic<number>, curr: number) => {
        const label = this.getLabelByIdx(preds, curr).replace(/__k__\d+$/, '')
        acc[label] = (acc[label] || 0) + results[curr]
        return acc
      },
      {} as Dic<number>
    )

    return _.orderBy(
      Object.keys(reducedResults).map((idx) => ({ label: idx, confidence: reducedResults[idx] })),
      'confidence',
      'desc'
    )
  }

  private async _predictOne(preds: Predictors, coordinates: number[]): Promise<Prediction[]> {
    // might simply use oneclass instead
    const results = await preds.clf.predict(coordinates)
    return [
      {
        label: this.getLabelByIdx(preds, results),
        confidence: 0
      }
    ]
  }

  private getLabelByIdx(preds: Predictors, idx: number): string {
    idx = Math.round(idx)
    if (idx < 0) {
      throw new Error(`Invalid prediction, prediction must be between 0 and ${preds.labels.length}`)
    }
    return preds.labels[idx]
  }

  private _extractSeed(options?: SVMOptions): number {
    const seed = options?.seed
    return seed ?? Math.round(Math.random() * 10000)
  }
}
