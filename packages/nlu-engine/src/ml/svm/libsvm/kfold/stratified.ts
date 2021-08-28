import _ from 'lodash'
import { Data } from '../typings'
import { Domain } from './domain'
import { Fold, KFold } from './typings'
import { assertPrecondtions, countClasses } from './utils'

export class StratifiedKFold implements KFold {
  constructor() {}

  public kfold(dataset: Data[], k: number): Fold[] {
    assertPrecondtions(dataset, k)

    const samplesPerClass = _(dataset)
      .groupBy((x) => x[1])
      .toPairs()
      .map(([label, samples]) => ({ label, samples }))
      .value()

    const folds: Fold[] = Array(k)
      .fill(0)
      .map(() => new Array(0))

    let currentFold = 0
    for (const c of samplesPerClass) {
      for (const s of c.samples) {
        folds[currentFold].push(s)
        currentFold = (currentFold + 1) % k
      }
    }

    return folds
  }

  public krange(dataset: Data[]): Domain {
    const uniqClasses = _.uniqBy(dataset, (d) => d[1])
    if (uniqClasses.length < 2) {
      return new Domain()
    }

    const n = dataset.length
    const mrc = _.maxBy(countClasses(dataset), (x) => x.count)!

    const min = 1
    const max = n - mrc.count > 1 ? n : 1
    return new Domain([min, max])
  }
}
