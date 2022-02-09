import { CRF, SVM } from '../toolkit'

export type TaskInput =
  | {
      trainingType: 'svm'
      points: SVM.DataPoint[]
      options: SVM.SVMOptions
    }
  | {
      trainingType: 'crf'
      points: CRF.DataPoint[]
      options: CRF.TrainerOptions
    }

export type TaskOutput = Buffer
