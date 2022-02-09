import _ from 'lodash'
import * as MLToolkit from '../../ml/toolkit'
import { Logger } from '../../typings'

export class FakeSvmTrainer {
  public static async train(
    points: MLToolkit.SVM.DataPoint[],
    options: MLToolkit.SVM.SVMOptions | undefined,
    logger: Logger,
    callback: MLToolkit.SVM.TrainProgressCallback | undefined
  ): Promise<Buffer> {
    if (!points.length) {
      throw new Error('fake SVM needs datapoints')
    }
    callback?.(1)
    return Buffer.from(
      _(points)
        .map((p) => p.label)
        .uniq()
        .value()
        .join(',')
    )
  }
}

export class FakeSvmPredictor implements MLToolkit.SVM.IPredictor {
  constructor(private model: Buffer) {}

  public static async create(model: Buffer) {
    return new FakeSvmPredictor(model)
  }

  public async predict(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    const labels = this.model.toString().split(',')
    return labels.map((label) => ({ label, confidence: 1 / labels.length }))
  }

  public isLoaded(): boolean {
    return true
  }

  public getLabels(): string[] {
    return this.model.toString().split(',')
  }
}
