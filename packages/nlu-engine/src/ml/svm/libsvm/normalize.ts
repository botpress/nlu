import assert from 'assert'
import _ from 'lodash'
import numeric from 'numeric'

import { Data } from './typings'

export function normalizeDataset(dataset: Data[], p_mu?: number[], p_sigma?: number[]) {
  assert(dataset instanceof Array, 'dataset must be an list of [X,y] tuples')
  assert(dataset.length > 0, 'dataset cannot be empty')

  const X = dataset.map((s) => s[0])
  const n = numeric.dim(X)[0] || 0
  const m = numeric.dim(X)[1] || 0

  assert(m > 0, 'number of features must be gt 0')

  const mu = p_mu || _.range(m).map((i) => _.mean(X.map((x) => x[i] || 0)))
  const sigma = p_sigma || _.range(m).map((i) => std(X.map((x) => x[i] || 0)))

  return {
    dataset: dataset.map((l) => [normalizeInput(l[0], mu, sigma), l[1]] as Data),
    mu,
    sigma
  }
}

export function normalizeInput(input: number[], mu: number[], sigma: number[]) {
  assert(input instanceof Array, 'input must be a 1d array')
  assert(mu instanceof Array, 'mu must be a 1d array')
  assert(sigma instanceof Array, 'sigma must be a 1d array')
  const sigmaInv = sigma.map(function (value) {
    return value === 0 ? 1 : 1 / value
  })
  return numeric.mul(numeric.add(input, numeric.neg(mu)), sigmaInv)
}

function std(arr: number[]) {
  const avg = _.mean(arr)
  const constiance = _.reduce(arr, (sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length
  return Math.pow(constiance, 0.5)
}
