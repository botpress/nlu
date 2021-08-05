import { TrainingState, http } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type TrainingTrx = (repo: WrittableTrainingRepository) => Promise<void>

export interface ReadonlyTrainingRepository {
  initialize: () => Promise<void>
  teardown: () => Promise<void>
  get: (id: TrainingId) => Promise<TrainingState | undefined>
  query: (query: Partial<TrainingState>) => Promise<Training[]>
  delete: (id: TrainingId) => Promise<void>
}

export interface WrittableTrainingRepository extends ReadonlyTrainingRepository {
  set: (id: TrainingId, state: TrainingState) => Promise<void>
}

export interface TrainingRepository extends ReadonlyTrainingRepository {
  inTransaction: (trx: TrainingTrx) => Promise<void> // Promise resolves once transaction is over
}

export type TrainingId = ModelId & http.Credentials

export interface Training {
  id: TrainingId
  state: TrainingState
}
