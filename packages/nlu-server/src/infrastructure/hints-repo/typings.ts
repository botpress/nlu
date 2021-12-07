import { ModelId } from '@botpress/nlu-engine'
import { DatasetIssue, IssueCode } from '@botpress/nlu-engine/src/hints'

export type HintsRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getHints(appId: string, modelId: ModelId): Promise<DatasetIssue<IssueCode>[]>
  appendHints(appId: string, modelId: ModelId, hints: DatasetIssue<IssueCode>[]): Promise<void | void[]>
}
