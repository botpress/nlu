import { toUnix } from './to-unix'

test.each([
  ['C:\\my\\path', '/my/path'],
  ['\\my\\path', '/my/path'],
  ['/my/path', '/my/path'],
  ['C:\\', '/'],
  ['/', '/']
])('calling toUnix("%s") should return "%s"', (x, expected) => {
  const actual = toUnix(x)
  expect(actual).toBe(expected)
})
