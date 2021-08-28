import { Data } from '../typings'
import { BaseKFold } from './base'

describe('base kfolding', () => {
  test('base kfold with n === 0 mod k', () => {
    // arrange
    const samples: Data[] = [
      [[0, 0], 1],
      [[0, 0], 2],
      [[0, 0], 3],
      [[0, 0], 4],
      [[0, 0], 5],
      [[0, 0], 6],
      [[0, 0], 7],
      [[0, 0], 8]
    ]

    const k = 4

    // act
    const folds = new BaseKFold().kfold(samples, k)

    // assert
    expect(folds.length).toBe(k)
    expect(folds.some((f) => f.length !== 2)).toBe(false)
    expect(folds[0][0][1]).toBe(1)
    expect(folds[0][1][1]).toBe(2)
    expect(folds[1][0][1]).toBe(3)
    expect(folds[1][1][1]).toBe(4)
    expect(folds[2][0][1]).toBe(5)
    expect(folds[2][1][1]).toBe(6)
    expect(folds[3][0][1]).toBe(7)
    expect(folds[3][1][1]).toBe(8)
  })

  test('base kfold with n !== 0 mod k', () => {
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

    const k = 4

    // act
    const folds = new BaseKFold().kfold(samples, k)

    // assert
    expect(folds.length).toBe(k)
    expect(folds[0].length).toBe(3)
    expect(folds[0][0][1]).toBe(1)
    expect(folds[0][1][1]).toBe(2)
    expect(folds[0][2][1]).toBe(3)

    expect(folds[1].length).toBe(2)
    expect(folds[1][0][1]).toBe(4)
    expect(folds[1][1][1]).toBe(5)

    expect(folds[2].length).toBe(2)
    expect(folds[2][0][1]).toBe(6)
    expect(folds[2][1][1]).toBe(7)

    expect(folds[3].length).toBe(2)
    expect(folds[3][0][1]).toBe(8)
    expect(folds[3][1][1]).toBe(9)
  })

  test('base kfold should throw if preconditions are not matched', () => {
    const kfolder = new BaseKFold()

    const sample0: Data = [[0, 0], 0]
    const sample1: Data = [[0, 0], 1]

    expect(() => kfolder.kfold([], 0)).toThrowError()
    expect(() => kfolder.kfold([], 69)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], 0)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], -69)).toThrowError()
    expect(() => kfolder.kfold([sample0, sample1], 3)).toThrowError()
  })

  test('base kfold k === 1', () => {
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
    const folds = new BaseKFold().kfold(samples, k)

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
