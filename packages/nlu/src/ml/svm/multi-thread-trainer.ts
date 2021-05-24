import nanoid from 'nanoid'
import mLThreadPool from '../ml-thread-pool'
import { MLToolkit } from '../typings'
import { Trainer } from '.'

export class MultiThreadTrainer extends Trainer {
  public async train(
    elements: MLToolkit.SVM.DataPoint[],
    options: MLToolkit.SVM.SVMOptions,
    progressCallback: (iteration: number) => void
  ) {
    const id = nanoid()
    const output = await mLThreadPool.startSvmTraining(id, elements, options, progressCallback)
    return output
  }
}
