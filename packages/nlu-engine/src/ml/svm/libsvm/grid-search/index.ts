import assert from 'assert'
import Bluebird from 'bluebird'
import _ from 'lodash'
import numeric from 'numeric'
import { Logger } from 'src/typings'

import BaseSVM from '../base-svm'
import { defaultParameters } from '../config'
import { foldsToSplits, StratifiedKFold } from '../kfold'
import { Domain } from '../kfold/domain'
import { Data, SvmConfig } from '../typings'

import crossCombinations from './cross-combinations'
import evaluators from './evaluators'
import { GridSearchProgress, GridSearchResult } from './typings'

export default (logger?: Logger) => async (
  dataset: Data[],
  config: SvmConfig,
  seed: number,
  progressCb: (progress: GridSearchProgress) => void
): Promise<GridSearchResult> => {
  const dims = numeric.dim(dataset)

  assert(dims[0] > 0 && dims[1] === 2 && dims[2] > 0, 'dataset must be a list of [X,y] tuples')

  const arr = (x?: number | number[]) => (x as number[]) || []
  const combs = crossCombinations([
    arr(config.C),
    arr(config.gamma),
    arr(config.p),
    arr(config.nu),
    arr(config.degree),
    arr(config.coef0)
  ])

  const kfolder = new StratifiedKFold()
  const safeRange = kfolder.krange(dataset)

  let k = config.kFold
  if (!safeRange.includes(config.kFold)) {
    const msg = 'Make sure your dataset is not highly imbalanced.'

    const closest = safeRange.difference(new Domain(1)).getClosest(k)
    if (!closest) {
      const notice = safeRange.includes(1) ? ' (outside of k === 1)' : ''
      throw new Error(`There seems to be no value of k${notice} that safely kfolds the dataset. ${msg}`)
    }
    logger?.warning(`It is not safe to kfold your dataset with k === ${k}; falling back on ${closest}. ${msg}`)
    k = closest
  }
  const folds = kfolder.kfold([...dataset], k)
  const subsets = foldsToSplits(folds)

  const evaluator = evaluators(config)

  if (combs.length === 1) {
    progressCb({ done: 1, total: 1 })
    const comb = combs[0]
    const params = defaultParameters({
      ...config,
      C: comb[0],
      gamma: comb[1],
      p: comb[2],
      nu: comb[3],
      degree: comb[4],
      coef0: comb[5]
    })
    return { params }
  }

  const total = combs.length * subsets.length
  let done = 0

  const results = await Bluebird.map(combs, async (comb) => {
    const params = defaultParameters({
      ...config,
      C: comb[0],
      gamma: comb[1],
      p: comb[2],
      nu: comb[3],
      degree: comb[4],
      coef0: comb[5]
    })

    const nestedPredictions = await Bluebird.map(subsets, async (ss) => {
      const clf = new BaseSVM()

      await clf.train(ss.train, seed, params)
      done += 1
      progressCb({ done, total })

      const predictions = ss.test.map((test) => {
        return [clf.predictSync(test[0]), test[1]]
      })

      clf.free()
      return predictions
    })

    const predictions = _.flatten(nestedPredictions)
    const report = evaluator.compute(predictions)

    return {
      params,
      report
    } as GridSearchResult
  })

  return evaluator.electBest(results)
}
