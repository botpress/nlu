import { TrainingState as TrainingStateDto, TrainInput } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type TrainingTrx = (repo: WrittableTrainingRepository) => Promise<void>

export interface ReadonlyTrainingRepository {
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: TrainingId) => Promise<Training | undefined>
  query: (query: Partial<Training>) => Promise<Training[]>
  queryOlderThan: (query: Partial<Training>, threshold: Date) => Promise<Training[]>
  delete: (id: TrainingId) => Promise<void>
}

export interface WrittableTrainingRepository extends ReadonlyTrainingRepository {
  set: (training: Training) => Promise<void>
}

export interface TrainingRepository extends ReadonlyTrainingRepository {
  inTransaction: (trx: TrainingTrx, name: string) => Promise<void> // Promise resolves once transaction is over
}

export interface TrainingId {
  modelId: ModelId
  appId: string
}

export type TrainingState = TrainingStateDto & {
  cluster: string
  training_time: number
}

export interface Training extends TrainingId, TrainingState {
  dataset: TrainInput
}
