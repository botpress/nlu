import { LintingState } from '@botpress/nlu-client'
import { ModelId } from '@botpress/nlu-engine'

export type LintingRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  get(appId: string, modelId: ModelId): Promise<LintingState | undefined>
  set(appId: string, modelId: ModelId, state: LintingState): Promise<void | void[]>
  has(appId: string, modelId: ModelId): Promise<boolean>
}
