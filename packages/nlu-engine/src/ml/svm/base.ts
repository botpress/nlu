import _ from 'lodash'
import { PipelineComponent } from 'src/component'
import { Logger } from 'src/typings'

import { SVM } from './libsvm'
import { Data, KernelTypes, Parameters, SvmTypes } from './libsvm/typings'
import { deserializeModel, serializeModel } from './serialization'
import { SvmTrainInput, Prediction, TrainProgressCallback, SVMOptions } from './typings'

type Predictors = {
  clf: SVM
  labels: string[]
  parameters: Parameters
}

type Dic<T> = _.Dictionary<T>

export class SVMClassifier implements PipelineComponent<SvmTrainInput, number[], Prediction[]> {
  private static _displayName = 'SVM Intent Classifier'
  private static _name = 'svm-classifier'

  private _predictors: Predictors | undefined

  public get name() {
    return SVMClassifier._name
  }

  constructor(protected logger: Logger) {}

  public async train(input: SvmTrainInput, callback: TrainProgressCallback | undefined): Promise<Buffer> {
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
    const ser = serializeModel({ ...model, labels_idx: labels })
    return ser
  }

  public load = async (serialized: Buffer) => {
    const { labels_idx: labels, ...model } = deserializeModel(serialized)
    const { param: parameters } = model
    const clf = new SVM({ kFold: 1 })
    await clf.initialize(model)
    this._predictors = {
      clf,
      labels,
      parameters
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
