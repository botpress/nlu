import _ from 'lodash'
import { Logger } from 'src/typings'

import { SVM } from './libsvm'
import { Data, KernelTypes, Parameters, SvmTypes } from './libsvm/typings'
import { deserializeModel, serializeModel } from './serialization'
import * as types from './typings'

export class Trainer {
  public static async train(
    points: types.DataPoint[],
    options: types.SVMOptions,
    logger: Logger,
    callback: types.TrainProgressCallback | undefined
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
      logger
    )

    const seed = this._extractSeed(options)
    const trainResult = await svm.train(dataset, seed, (progress) => {
      if (callback && typeof callback === 'function') {
        callback(progress)
      }
    })
    svm.free()

    if (!trainResult) {
      return Buffer.from('')
    }

    const { model } = trainResult
    const ser = serializeModel({ ...model, labels_idx: labels })
    return ser
  }

  private static _extractSeed(options?: types.SVMOptions): number {
    const seed = options?.seed
    return seed ?? Math.round(Math.random() * 10000)
  }
}

export class Predictor {
  private constructor(
    private clf: SVM | undefined,
    private labels: string[],
    private parameters: Parameters | undefined
  ) {}

  public static async create(serialized: Buffer) {
    const { labels_idx, ...model } = deserializeModel(serialized)
    const { param: parameters } = model
    const clf = new SVM({ kFold: 1 })
    await clf.initialize(model)
    return new Predictor(clf, labels_idx, parameters)
  }

  private getLabelByIdx(idx): string {
    idx = Math.round(idx)
    if (idx < 0) {
      throw new Error(`Invalid prediction, prediction must be between 0 and ${this.labels.length}`)
    }

    return this.labels[idx]
  }

  public async predict(coordinates: number[]): Promise<types.Prediction[]> {
    if (this.parameters?.probability) {
      return this._predictProb(coordinates)
    } else {
      return this._predictOne(coordinates)
    }
  }

  private async _predictProb(coordinates: number[]): Promise<types.Prediction[]> {
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

  private async _predictOne(coordinates: number[]): Promise<types.Prediction[]> {
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
