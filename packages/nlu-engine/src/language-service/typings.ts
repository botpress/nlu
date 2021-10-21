import { MLToolkit } from '../ml/typings'

export interface ModelSet {
  bpeModel: AvailableModel | LoadedBPEModel
  fastTextModel: AvailableModel | LoadedFastTextModel
}

export interface AvailableModel {
  name: string
  path: string
  loaded: boolean
  sizeInMb: number
}

export interface LoadedFastTextModel extends AvailableModel {
  model: MLToolkit.FastText.Model
}

export interface LoadedBPEModel extends AvailableModel {
  tokenizer: MLToolkit.SentencePiece.Processor
}

export interface ModelFileInfo {
  domain: string
  langCode: string
  file: string
  dim?: number
}
