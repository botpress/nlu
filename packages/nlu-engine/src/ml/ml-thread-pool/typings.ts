import { MLToolkit } from '../typings'

export type TaskInput =
  | {
      trainingType: 'svm'
      points: MLToolkit.SVM.DataPoint[]
      options: MLToolkit.SVM.SVMOptions
    }
  | {
      trainingType: 'crf'
      points: MLToolkit.CRF.DataPoint[]
      options: MLToolkit.CRF.TrainerOptions
    }

export type TaskOutput = Uint8Array
