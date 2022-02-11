import { nanoid } from 'nanoid'
import mLThreadPool from '../ml-thread-pool'
import { SVMClassifier as BaseTrainer } from './base'
import { SvmTrainInput } from './typings'

export class MultiThreadSVMClassifier extends BaseTrainer {
  public async train(input: SvmTrainInput, progressCallback: (iteration: number) => void) {
    const { points, options } = input
    const id = nanoid()
    const output = await mLThreadPool(this.logger).startSvmTraining(id, points, options, progressCallback)
    return Buffer.from(output)
  }
}
