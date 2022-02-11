import _ from 'lodash'
import * as MLToolkit from '../../ml/toolkit'

export class FakeSvm extends MLToolkit.SVM.Classifier {
  private model: string | undefined

  public async train(
    input: MLToolkit.SVM.SVMTrainInput,
    callback: MLToolkit.SVM.TrainProgressCallback | undefined
  ): Promise<Buffer> {
    const { points } = input
    if (!points.length) {
      throw new Error('fake SVM needs datapoints')
    }
    callback?.(1)

    const strModel: string = _(points)
      .map((p) => p.label)
      .uniq()
      .value()
      .join(',')
    return Buffer.from(strModel, 'utf8')
  }

  public load = async (model: Buffer) => {
    this.model = model.toString('utf8')
  }

  public async predict(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    if (!this.model) {
      throw new Error('Fake SVm must load model before calling predict.')
    }
    const labels = this.model.split(',')
    return labels.map((label) => ({ label, confidence: 1 / labels.length }))
  }
}
