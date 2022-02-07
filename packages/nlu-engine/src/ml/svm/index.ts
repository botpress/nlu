import _ from 'lodash'
import { Logger } from 'src/typings'
import { MLToolkit } from '../typings'

import { SVM } from './libsvm'
import { Data, KernelTypes, SvmModel, Parameters, SvmTypes } from './libsvm/typings'
import { deserializeModel, serializeModel } from './serialization'

export class Trainer implements MLToolkit.SVM.Trainer {
  private model?: SvmModel
  private svm?: SVM

  constructor(protected logger: Logger) {}

  public cancelTraining() {
    this.svm?.cancelTraining()
  }

  public async train(
    points: MLToolkit.SVM.DataPoint[],
    options?: MLToolkit.SVM.SVMOptions,
    callback?: MLToolkit.SVM.TrainProgressCallback | undefined
  ): Promise<Buffer> {
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
    this.svm = new SVM(
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
    const trainResult = await this.svm.train(dataset, seed, (progress) => {
      if (callback && typeof callback === 'function') {
        callback(progress)
      }
    })
    this.svm.free()

    if (!trainResult) {
      return Buffer.from('')
    }

    const { model } = trainResult
    this.model = model
    const ser = serializeModel({ ...model, labels_idx: labels })
    return ser
  }

  public isTrained(): boolean {
    return !!this.model
  }

  private _extractSeed(options?: MLToolkit.SVM.SVMOptions): number {
    const seed = options?.seed
    return seed ?? Math.round(Math.random() * 10000)
  }
}

export class Predictor implements MLToolkit.SVM.Predictor {
  private clf: SVM | undefined
  private labels: string[]
  private parameters: Parameters | undefined
  private model: SvmModel

  // TODO: no need for both a ctor and a initialize function; it uses too much memory for no purpose
  constructor(serialized: Buffer) {
    const { labels_idx, ...model } = deserializeModel(serialized)
    this.labels = labels_idx
    this.model = model
  }

  public async initialize() {
    try {
      this.parameters = this.model.param
      this.clf = new SVM({ kFold: 1 })
      await this.clf.initialize(this.model)
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this.throwModelHasChanged(err)
    }
  }

  private throwModelHasChanged(err?: Error) {
    let errorMsg = 'SVM model format has changed. NLU needs to be retrained.'
    if (err) {
      errorMsg += ` Inner error is '${err}'.`
    }
    throw new Error(errorMsg)
  }

  private getLabelByIdx(idx): string {
    idx = Math.round(idx)
    if (idx < 0) {
      throw new Error(`Invalid prediction, prediction must be between 0 and ${this.labels.length}`)
    }

    return this.labels[idx]
  }

  public async predict(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    if (this.parameters?.probability) {
      return this._predictProb(coordinates)
    } else {
      return this._predictOne(coordinates)
    }
  }

  private async _predictProb(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    const results = await (this.clf as SVM).predictProbabilities(coordinates)
    const reducedResults = _.reduce(
      Object.keys(results),
      (acc, curr) => {
        const label = this.getLabelByIdx(curr).replace(/__k__\d+$/, '')
        acc[label] = (acc[label] || 0) + results[curr]
        return acc
      },
      {}
    )

    return _.orderBy(
      Object.keys(reducedResults).map((idx) => ({ label: idx, confidence: reducedResults[idx] })),
      'confidence',
      'desc'
    )
  }

  private async _predictOne(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    // might simply use oneclass instead
    const results = await (this.clf as SVM).predict(coordinates)
    return [
      {
        label: this.getLabelByIdx(results),
        confidence: 0
      }
    ]
  }

  public isLoaded(): boolean {
    return !!this.clf
  }

  public getLabels(): string[] {
    return _.values(this.labels)
  }
}
