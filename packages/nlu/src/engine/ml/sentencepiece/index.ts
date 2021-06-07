import { makeProcessor } from '@botpress/node-sentencepiece'
import { MLToolkit } from '../typings'

export const processor: () => Promise<MLToolkit.SentencePiece.Processor> = () => {
  return makeProcessor()
}
