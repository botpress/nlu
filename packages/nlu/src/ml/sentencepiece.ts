import { MLToolkit } from './typings'

const sp = require('./sentencepiece.node')
export const processor: () => MLToolkit.SentencePiece.Processor = () => {
  return new sp.Processor()
}
