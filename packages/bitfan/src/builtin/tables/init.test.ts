import { initDic } from './init'

test('initDictionary', () => {
  // arrange

  // act
  const table = initDic(['A', 'B'], () => 69)

  // assert
  expect(table['A']).toBe(69)
  expect(table['B']).toBe(69)
})
