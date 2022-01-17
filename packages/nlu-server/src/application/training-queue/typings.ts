import { TrainingErrorType } from '@botpress/nlu-client'

export type TrainTaskData = {
  trainingTime?: number
}

export type TrainTaskError = {
  actualErrorType: TrainingErrorType
}
