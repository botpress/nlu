import _ from 'lodash'
import { Data } from '../typings'
import { StratifiedKFold } from './stratified'
import { Fold } from './typings'

const getClasses = (fold: Fold) =>
  _(fold)
    .map((f) => f[1])
    .uniq()
    .value()

const isPresentInAllFolds = (folds: Fold[]) => (c: number) =>
  folds.map(getClasses).every((classes) => classes.includes(c))

const isPresentInNFolds = (folds: Fold[]) => (c: number, n: number) =>
  folds.map(getClasses).filter((classes) => classes.includes(c)).length >= n

describe('stratified kfolding', () => {
  test('stratified kfold with k | n should make sure every class appears in every fold if possible.', () => {
    // arrange
    const samples: Data[] = [
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 2],
      [[0, 0], 2],
      [[0, 0], 3],
      [[0, 0], 3]
    ]

    const k = 2

    // act
    const folds = new StratifiedKFold().kfold(samples, k)

    // assert

    expect(folds.length).toBe(k)
    expect(isPresentInAllFolds(folds)(1)).toBe(true)
    expect(isPresentInAllFolds(folds)(2)).toBe(true)
    expect(isPresentInAllFolds(folds)(3)).toBe(true)
    expect(folds.map((f) => f.length)).toStrictEqual([4, 4])
  })

  test('stratified kfold with n !== 0 mod n, should make sure every class appears in every fold if possible.', () => {
    // arrange
    const samples: Data[] = [
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 2],
      [[0, 0], 2],
      [[0, 0], 3],
      [[0, 0], 3]
    ]

    const k = 2

    // act
    const folds = new StratifiedKFold().kfold(samples, k)

    // assert
    expect(folds.length).toBe(k)
    expect(isPresentInAllFolds(folds)(1)).toBe(true)
    expect(isPresentInAllFolds(folds)(2)).toBe(true)
    expect(isPresentInAllFolds(folds)(3)).toBe(true)
    expect(folds.map((f) => f.length).sort()).toStrictEqual([4, 5])
  })

  test('stratified kfold should always try to equally split classes in all folds.', () => {
    // arrange
    const samples: Data[] = [
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 1],
      [[0, 0], 2],
      [[0, 0], 2],
      [[0, 0], 3],
      [[0, 0], 3]
    ]

    const k = 4

    // act
    const folds = new StratifiedKFold().kfold(samples, k)

    // assert
    expect(folds.length).toBe(k)
    expect(folds.map((f) => f.length).sort()).toStrictEqual([2, 2, 2, 3])

    expect(isPresentInAllFolds(folds)(1)).toBe(true)
    expect(isPresentInNFolds(folds)(2, 2)).toBe(true)
    expect(isPresentInNFolds(folds)(3, 2)).toBe(true)

    expect(
      folds
        .map((f) => f.filter((d) => d[1] === 1))
        .map((f) => f.length)
        .sort()
    ).toStrictEqual([1, 1, 1, 2])
  })

  test('stratified kfold should throw if preconditions are not matched', () => {
    const kfolder = new StratifiedKFold()

    const sample0: Data = [[0, 0], 0]
    const sample1: Data = [[0, 0], 1]

    expect(() => kfolder.kfold([], 0)).toThrowError()
    expect(() => kfolder.kfold([], 69)).toThrowError()
    expect(() => kfolder.kfold([], -69)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], 0)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], 69)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], -69)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], 3)).toThrowError()
  })

  test('stratified kfold k === 1', () => {
    // arrange
    const samples: Data[] = [
      [[0, 0], 1],
      [[0, 0], 2],
      [[0, 0], 3],
      [[0, 0], 4],
      [[0, 0], 5],
      [[0, 0], 6],
      [[0, 0], 7],
      [[0, 0], 8],
      [[0, 0], 9]
    ]

    const k = 1

    // act
    const folds = new StratifiedKFold().kfold(samples, k)

    // assert
    expect(folds.length).toBe(k)
    expect(folds[0].length).toBe(samples.length)
    expect(folds[0][0][1]).toBe(1)
    expect(folds[0][1][1]).toBe(2)
    expect(folds[0][2][1]).toBe(3)
    expect(folds[0][3][1]).toBe(4)
    expect(folds[0][4][1]).toBe(5)
    expect(folds[0][5][1]).toBe(6)
    expect(folds[0][6][1]).toBe(7)
    expect(folds[0][7][1]).toBe(8)
  })
})
