import { Domain } from '.'
import './jest-helpers'

test('Domain union, intersection, difference and inclusion', () => {
  const dom0 = new Domain(1, [3, 8], 5, 69, [27, 19])
  const dom1 = dom0.difference(new Domain(1, [22, 25]))
  const dom2 = dom0.intersection(new Domain([20, 77]))
  const dom3 = dom2.union(new Domain([10, 25], 666))

  expect(dom0).toEqualDomain(new Domain(1, [3, 8], [19, 27], 69))
  expect(dom1).toEqualDomain(new Domain([3, 8], [19, 21], [26, 27], 69))
  expect(dom2).toEqualDomain(new Domain([20, 27], 69))
  expect(dom3).toEqualDomain(new Domain([10, 27], 69, 666))

  expect(dom3).toIntersect(new Domain([0, 100]))
  expect(dom3).toIntersect(new Domain(22))
  expect(dom3).toIntersect(new Domain(666))
  expect(dom3).toIntersect(new Domain([28, 68], 11))

  expect(dom3).not.toIntersect(new Domain([28, 68]))
  expect(dom3).not.toIntersect(new Domain(0))

  expect(dom1).toInclude(5)
  expect(dom3).toInclude(666)
  expect(dom2).not.toInclude(19)
})
