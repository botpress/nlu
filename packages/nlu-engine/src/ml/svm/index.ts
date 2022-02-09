import { Logger } from 'src/typings'
import { Trainer as BaseTrainer, Predictor } from './base'
import { MultiThreadTrainer } from './multi-thread-trainer'
import * as types from './typings'

type TrainerNamespace = {
  train(
    points: types.DataPoint[],
    options: types.SVMOptions,
    logger: Logger,
    callback: types.TrainProgressCallback | undefined
  ): Promise<Buffer>
}

type PredictorNamespace = {
  create: (model: Buffer) => Promise<types.IPredictor>
}

const isTsNode = !!process.env.TS_NODE_DEV // worker_threads do not work with ts-node

const TrainerNS: TrainerNamespace = isTsNode ? BaseTrainer : MultiThreadTrainer
const PredictorNS: PredictorNamespace = Predictor

export * from './typings'
export { PredictorNS as Predictor, TrainerNS as Trainer }
