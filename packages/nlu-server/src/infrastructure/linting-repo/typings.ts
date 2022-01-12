import { LintingState } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type LintingRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  get(id: LintingId): Promise<LintingState | undefined>
  set(linting: Linting): Promise<void>
  has(id: LintingId): Promise<boolean>
}

export type LintingId = {
  modelId: ModelId
  appId: string
}

export type Linting = LintingId & LintingState
