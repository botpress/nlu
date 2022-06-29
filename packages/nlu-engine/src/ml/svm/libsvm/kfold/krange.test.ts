import './domain/jest-helpers'

import _ from 'lodash'
import { Data } from '../typings'
import { BaseKFold } from './base'
import { Domain } from './domain'
import { StratifiedKFold } from './stratified'

const x: Data = [[0, 0], 1]
const o: Data = [[0, 0], 2]
const $: Data = [[0, 0], 3]

type Test = {
  idx: number
  ds: Data[]
  base: Domain
  stratified: Domain
}

const tests: Test[] = [
  { idx: 0, ds: [x, x, x, x, x], base: new Domain(), stratified: new Domain() },
  { idx: 1, ds: [x, x, x, x, o], base: new Domain(1), stratified: new Domain(1) },
  { idx: 2, ds: [x, x, x, o, o], base: new Domain(1, 5), stratified: new Domain([1, 5]) },
  { idx: 3, ds: [x, x, x, $, o], base: new Domain(1, 5), stratified: new Domain([1, 5]) },
  { idx: 4, ds: [x, x, x, x, $, $, o, o], base: new Domain(1, [3, 8]), stratified: new Domain([1, 8]) },
  { idx: 5, ds: [x, o], base: new Domain(1), stratified: new Domain(1) }
]

const baseKFolder = new BaseKFold()
const startifiedKFolder = new StratifiedKFold()

describe('safe k ranges', () => {
  test('test 0', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 0)!
    expect(baseKFolder.krange(ds)).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)
  })

  test('test 1', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 1)!
    expect(baseKFolder.krange(ds)).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)
  })

  test('test 2', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 2)!
    expect(baseKFolder.krange(ds)).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)
  })

  test('test 3', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 3)!

    const baseSafeDomain = baseKFolder.krange(ds)
    expect(baseSafeDomain).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)

    expect([1, 5]).toContain(baseSafeDomain.getClosest(2))
    expect(baseSafeDomain.difference(new Domain(5)).getClosest(2)).toEqual(1)
    expect(baseSafeDomain.difference(new Domain(1)).getClosest(2)).toEqual(5)
    expect(baseSafeDomain.getClosest(1)).toEqual(1)
    expect(baseSafeDomain.difference(new Domain(1)).getClosest(1)).toEqual(5)
  })

  test('test 4', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 4)!

    const baseSafeRange = baseKFolder.krange(ds)
    expect(baseSafeRange).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)

    expect([1, 3]).toContain(baseSafeRange.getClosest(2))
    expect(baseSafeRange.difference(new Domain(3)).getClosest(2)).toEqual(1)
    expect(baseSafeRange.difference(new Domain(1)).getClosest(2)).toEqual(3)
    expect(baseSafeRange.getClosest(4)).toEqual(4)
    expect(baseSafeRange.difference(new Domain(3)).getClosest(3)).toEqual(4)
  })

  test('test 5', () => {
    const { ds, base, stratified } = tests.find((t) => t.idx === 5)!
    expect(baseKFolder.krange(ds)).toEqualDomain(base)
    expect(startifiedKFolder.krange(ds)).toEqualDomain(stratified)
  })
})
