import { ModelId } from '@botpress/nlu-engine'

export type PruneOptions = {
  keep: number
}

export type ModelRepository = {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getModel(appId: string, modelId: ModelId): Promise<Buffer | undefined>
  saveModel(appId: string, modelId: ModelId, model: Buffer): Promise<void | void[]>
  listModels(appId: string, filters?: Partial<ModelId>): Promise<ModelId[]>
  pruneModels(appId: string, options: PruneOptions, filters?: Partial<ModelId>): Promise<ModelId[]>
  exists(appId: string, modelId: ModelId): Promise<boolean>
  deleteModel(appId: string, modelId: ModelId): Promise<void>
}
