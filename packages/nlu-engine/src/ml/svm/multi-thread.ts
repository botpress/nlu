import { nanoid } from 'nanoid'
import mLThreadPool from '../ml-thread-pool'
import { SVMClassifier } from './base'
import { SVMTrainInput } from './typings'

export class MultiThreadSVMClassifier extends SVMClassifier {
  public async train(input: SVMTrainInput, progressCallback: (iteration: number) => void) {
    const { points, options } = input
    const id = nanoid()
    const output = await mLThreadPool(this.logger).startSvmTraining(id, points, options, progressCallback)
    const bin = Buffer.from(output)
    return SVMClassifier.modelType.decode(bin)
  }
}
