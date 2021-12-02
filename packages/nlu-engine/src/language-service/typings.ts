import { MLToolkit } from '../ml/typings'

export type ModelSet = {
  bpeModel: AvailableModel | LoadedBPEModel
  fastTextModel: AvailableModel | LoadedFastTextModel
}

export type AvailableModel = {
  name: string
  path: string
  loaded: boolean
  sizeInMb: number
}

export type LoadedFastTextModel = {
  model: MLToolkit.FastText.Model
} & AvailableModel

export type LoadedBPEModel = {
  tokenizer: MLToolkit.SentencePiece.Processor
} & AvailableModel

export type ModelFileInfo = {
  domain: string
  langCode: string
  file: string
  dim?: number
}
