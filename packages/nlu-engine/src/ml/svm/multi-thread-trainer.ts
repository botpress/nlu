import { nanoid } from 'nanoid'
import { Logger } from 'src/typings'
import mLThreadPool from '../ml-thread-pool'
import { DataPoint, SVMOptions } from '.'
import { Trainer as BaseTrainer } from './base'

export class MultiThreadTrainer extends BaseTrainer {
  public static async train(
    elements: DataPoint[],
    options: SVMOptions,
    logger: Logger,
    progressCallback: (iteration: number) => void
  ) {
    const id = nanoid()
    const output = await mLThreadPool(logger).startSvmTraining(id, elements, options, progressCallback)
    return Buffer.from(output)
  }
}
