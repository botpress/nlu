import { ModelId, Model } from '@botpress/nlu-engine'

export interface PruneOptions {
  keep: number
}

export interface ModelRepository {
  initialize(): Promise<void>
  teardown(): Promise<void>
  getModel(appId: string, modelId: ModelId): Promise<Model | undefined>
  saveModel(appId: string, model: Model): Promise<void | void[]>
  listModels(appId: string, filters?: Partial<ModelId>): Promise<ModelId[]>
  pruneModels(appId: string, options: PruneOptions, filters?: Partial<ModelId>): Promise<ModelId[]>
  exists(appId: string, modelId: ModelId): Promise<boolean>
  deleteModel(appId: string, modelId: ModelId): Promise<void>
}
