import _ from 'lodash'
import { MLToolkit } from '../../ml/typings'

export class FakeSvmTrainer implements MLToolkit.SVM.Trainer {
  private _isTrained = false
  constructor() {}
  public async train(
    points: MLToolkit.SVM.DataPoint[],
    options?: MLToolkit.SVM.SVMOptions | undefined,
    callback?: MLToolkit.SVM.TrainProgressCallback | undefined
  ): Promise<Uint8Array> {
    if (!points.length) {
      throw new Error('fake SVM needs datapoints')
    }
    this._isTrained = true
    callback?.(1)
    return Buffer.from(
      _(points)
        .map((p) => p.label)
        .uniq()
        .value()
        .join(',')
    )
  }
  public isTrained(): boolean {
    return this._isTrained
  }
}

export class FakeSvmPredictor implements MLToolkit.SVM.Predictor {
  constructor(private model: Uint8Array) {}

  public async predict(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    const labels = this.model.toString().split(',')
    return labels.map((label) => ({ label, confidence: 1 / labels.length }))
  }

  public async initialize() {}

  public isLoaded(): boolean {
    return true
  }

  public getLabels(): string[] {
    return this.model.toString().split(',')
  }
}
