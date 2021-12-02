import { TrainingState as TrainingStateDto, TrainInput } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type TrainingTrx = (repo: WrittableTrainingRepository) => Promise<void>

export type TrainingListener = (training: Training) => Promise<void>

export type ReadonlyTrainingRepository = {
  addListener: (listener: TrainingListener) => void
  removeListener: (listener: TrainingListener) => void
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: TrainingId) => Promise<Training | undefined>
  has: (id: TrainingId) => Promise<boolean>
  query: (query: Partial<Training>) => Promise<Training[]>
  queryOlderThan: (query: Partial<Training>, threshold: Date) => Promise<Training[]>
  delete: (id: TrainingId) => Promise<void>
}

export type WrittableTrainingRepository = {
  set: (training: Training) => Promise<void>
} & ReadonlyTrainingRepository

export type TrainingRepository = {
  inTransaction: (trx: TrainingTrx, name: string) => Promise<void> // Promise resolves once transaction is over
} & ReadonlyTrainingRepository

export type TrainingId = {
  modelId: ModelId
  appId: string
}

export type TrainingState = TrainingStateDto & {
  cluster: string
  trainingTime?: number
}

export type Training = {
  dataset: TrainInput
} & TrainingId & TrainingState
