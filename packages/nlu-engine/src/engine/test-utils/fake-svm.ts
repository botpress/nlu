import _ from 'lodash'
import { ModelOf } from 'src/component'
import * as MLToolkit from '../../ml/toolkit'

export class FakeSvm extends MLToolkit.SVM.Classifier {
  private model: ModelOf<MLToolkit.SVM.Classifier> | undefined

  public async train(
    input: MLToolkit.SVM.SVMTrainInput,
    callback: MLToolkit.SVM.TrainProgressCallback | undefined
  ): Promise<ModelOf<MLToolkit.SVM.Classifier>> {
    const { points } = input
    if (!points.length) {
      throw new Error('fake SVM needs datapoints')
    }
    callback?.(1)

    const labels_idx = _(points)
      .map((p) => p.label)
      .uniq()
      .value()

    return {
      labels_idx
    } as ModelOf<MLToolkit.SVM.Classifier>
  }

  public load = async (model: ModelOf<MLToolkit.SVM.Classifier>) => {
    this.model = model
  }

  public async predict(coordinates: number[]): Promise<MLToolkit.SVM.Prediction[]> {
    if (!this.model) {
      throw new Error('Fake SVm must load model before calling predict.')
    }
    const labels = this.model.labels_idx ?? []
    return labels.map((label) => ({ label, confidence: 1 / labels.length }))
  }
}
