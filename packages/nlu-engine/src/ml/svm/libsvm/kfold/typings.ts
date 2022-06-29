import { Data } from '../typings'
import { Domain } from './domain'

export type Fold = Data[]

export type TrainTestSplit = {
  train: Data[]
  test: Data[]
}

export type KFold = {
  kfold(dataset: Data[], k: number): Fold[]
  krange(dataset: Data[]): Domain
}
