import { Logger } from 'src/typings'
import { Trainer as BaseTrainer, Tagger } from './base'
import { MultiThreadTrainer } from './multi-thread-trainer'
import * as types from './typings'

type TrainerNamespace = {
  train(
    elements: types.DataPoint[],
    options: types.TrainerOptions,
    logger: Logger,
    progressCallback: (iteration: number) => void
  ): Promise<Buffer>
}

type TaggerNamespace = {
  create: (model: Buffer) => Promise<types.ITagger>
}

const isTsNode = !!process.env.TS_NODE_DEV // worker_threads do not work with ts-node

const TrainerNS: TrainerNamespace = isTsNode ? BaseTrainer : MultiThreadTrainer
const TaggerNS: TaggerNamespace = Tagger

export * from './typings'
export { TrainerNS as Trainer, TaggerNS as Tagger }
