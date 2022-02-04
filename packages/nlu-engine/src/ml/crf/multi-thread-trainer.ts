import { nanoid } from 'nanoid'
import mLThreadPool from '../ml-thread-pool'
import { MLToolkit } from '../typings'
import { Trainer } from '.'

export class MultiThreadTrainer extends Trainer {
  public async train(
    elements: MLToolkit.CRF.DataPoint[],
    options: MLToolkit.CRF.TrainerOptions,
    progressCallback: (iteration: number) => void
  ) {
    const id = nanoid()
    const output = await mLThreadPool(this.logger).startCrfTraining(id, elements, options, progressCallback)
    return Buffer.from(output)
  }
}
