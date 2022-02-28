import { IssueComputationSpeed, LintingState as ClientLintingState, TrainInput } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type LintingRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  get(id: LintingId): Promise<Linting | undefined>
  set(linting: Linting): Promise<void>
  has(id: LintingId): Promise<boolean>
  query(query: Partial<LintingState>): Promise<Linting[]>
  queryOlderThan(query: Partial<LintingState>, treshold: Date): Promise<Linting[]>
}

export type LintingId = {
  modelId: ModelId
  appId: string
  speed: IssueComputationSpeed
}

export type LintingState = ClientLintingState & {
  cluster: string
}

export type Linting = LintingId &
  LintingState & {
    dataset: TrainInput
  }
