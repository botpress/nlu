import { Data } from '../typings'
import { Domain } from './domain'

export type Fold = Data[]

export interface TrainTestSplit {
  train: Data[]
  test: Data[]
}

export interface KFold {
  kfold(dataset: Data[], k: number): Fold[]
  krange(dataset: Data[]): Domain
}
