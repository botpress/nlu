import { CheckingState } from '@botpress/nlu-client/src/typings/hints'
import { ModelId } from '@botpress/nlu-engine'

export type HintsRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  get(appId: string, modelId: ModelId): Promise<CheckingState | undefined>
  set(appId: string, modelId: ModelId, state: CheckingState): Promise<void | void[]>
  has(appId: string, modelId: ModelId): Promise<boolean>
}
