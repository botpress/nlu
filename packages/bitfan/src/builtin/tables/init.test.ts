import { initDic } from './init'

test('initDictionnary', () => {
  // arrange

  // act
  const table = initDic(['A', 'B'], () => 69)

  // assert
  expect(table['A']).toBe(69)
  expect(table['B']).toBe(69)
})
