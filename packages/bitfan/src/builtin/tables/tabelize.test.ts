import * as sdk from '../../bitfan'
import { tabelize } from './tabelize'

test('toTable', () => {
  // arrange
  const performanceReport: sdk.PerformanceReport = {
    generatedOn: new Date(),
    scores: [
      { metric: 'avgScore', seed: 42, problem: 'A', score: 1 },
      { metric: 'accuracy', seed: 42, problem: 'A', score: 2 },
      { metric: 'avgScore', seed: 69, problem: 'A', score: 3 },
      { metric: 'accuracy', seed: 69, problem: 'A', score: 4 }
    ]
  }

  // act
  const table = tabelize(performanceReport.scores, {
    row: (d) => d.metric,
    column: (d) => `${d.seed}`,
    score: (d) => d.score
  })

  // assert
  expect(table['avgScore']['42']).toBe(1)
  expect(table['accuracy']['42']).toBe(2)
  expect(table['avgScore']['69']).toBe(3)
  expect(table['accuracy']['69']).toBe(4)
})
