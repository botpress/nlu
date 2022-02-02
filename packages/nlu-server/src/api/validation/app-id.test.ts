import { validateAppId } from '.'

test.each(['banana-split', 'some/funky/banana', 'banana-', 'banana/', 'banana1'])('appId %s should succeed', (x) => {
  expect(validateAppId(x)).toBe(x)
})

test.each(['some\\funky\\banana', '-banana', '/banana', '1banana', 'banana$', 'banana^'])(
  'appId %s should throw',
  (x) => {
    expect(() => validateAppId(x)).toThrow()
  }
)
