import _ from 'lodash'
import { Data } from '../typings'

export type ClassCount = {
  label: number
  count: number
}

export const countClasses = (dataset: Data[]): ClassCount[] => {
  return _(dataset)
    .groupBy((d: Data) => d[1])
    .mapValues((v: Data[]) => v.length)
    .toPairs()
    .map(([label, count]) => ({ label: Number(label), count }))
    .value()
}

export const assertPrecondtions = (dataset: Data[], k: number) => {
  const n = dataset.length
  if (!n) {
    throw new Error('Kfolding a dataset expects the dataset not to be empty.')
  }
  if (k < 1 || k > n) {
    throw new Error(`k is ${k} and n is ${n}, but k must be element of range [1, n].`)
  }
}
