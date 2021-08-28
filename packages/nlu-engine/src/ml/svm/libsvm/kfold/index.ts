import _ from 'lodash'
import { Fold, TrainTestSplit } from './typings'

export { RandomKFold } from './random'
export { StratifiedKFold } from './stratified'
export { BaseKFold } from './base'

export const foldsToSplits = (folds: Fold[]): TrainTestSplit[] => {
  if (folds.length < 2) {
    throw new Error("Can't transform a single fold to a train test split.")
  }

  const splits: TrainTestSplit[] = []
  for (let i = 0; i < folds.length; i++) {
    const test = folds[i]
    const train = _(folds)
      .filter((_f, j) => j !== i)
      .flatten()
      .value()
    splits.push({ train, test })
  }

  return splits
}
