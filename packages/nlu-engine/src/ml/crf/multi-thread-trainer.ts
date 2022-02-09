import { nanoid } from 'nanoid'
import { Logger } from 'src/typings'
import mLThreadPool from '../ml-thread-pool'
import { DataPoint, TrainerOptions } from '.'
import { Trainer } from './base'

export class MultiThreadTrainer extends Trainer {
  public static async train(
    elements: DataPoint[],
    options: TrainerOptions,
    logger: Logger,
    progressCallback: (iteration: number) => void
  ) {
    const id = nanoid()
    const output = await mLThreadPool(logger).startCrfTraining(id, elements, options, progressCallback)
    return Buffer.from(output)
  }
}
