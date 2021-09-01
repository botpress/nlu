import _ from 'lodash'
import { Data } from '../typings'
import { Domain } from './domain'
import { Fold, KFold } from './typings'
import { assertPrecondtions, countClasses } from './utils'

export class BaseKFold implements KFold {
  constructor() {}

  public kfold(dataset: Data[], k: number): Fold[] {
    assertPrecondtions(dataset, k)

    const n = dataset.length
    const foldSize = Math.floor(n / k)

    const folds: Fold[] = []

    const availableSamples = [...dataset]

    while (availableSamples.length) {
      const currentFoldSize = availableSamples.length % foldSize ? foldSize + 1 : foldSize
      const nextFold = availableSamples.splice(0, currentFoldSize)
      folds.push(nextFold)
    }

    return folds
  }

  public krange(dataset: Data[]): Domain {
    let safeDomain = new Domain()

    const uniqClasses = _.uniqBy(dataset, (d) => d[1])
    if (uniqClasses.length < 2) {
      return safeDomain
    }

    safeDomain = safeDomain.union(new Domain(1)) // its always valid not to split the dataset

    const mrc = _.maxBy(countClasses(dataset), ({ count }) => count)!
    const n = dataset.length
    const max = n

    const denominator = n - mrc.count - 1
    if (denominator <= 0) {
      return safeDomain
    }

    const min = Math.ceil(n / denominator)
    if (min <= max) {
      safeDomain = safeDomain.union(new Domain([min, max]))
    }
    return safeDomain
  }
}
