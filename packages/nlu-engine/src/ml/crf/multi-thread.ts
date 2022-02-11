import { nanoid } from 'nanoid'
import mLThreadPool from '../ml-thread-pool'
import { CRFTagger } from './base'
import { CRFTrainInput } from './typings'

export class MultiThreadCRFTagger extends CRFTagger {
  public async train(input: CRFTrainInput, progressCallback: (iteration: number) => void) {
    const { elements, options } = input
    const id = nanoid()
    const output = await mLThreadPool(this.logger).startCrfTraining(id, elements, options, progressCallback)
    const bin = Buffer.from(output)
    return CRFTagger.modelType.decode(bin)
  }
}
