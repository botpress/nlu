import { TrainInput } from '../../typings'
import { makeFakeTools } from '../test-utils/fake-tools'
import { parseUtterance } from '../utterance/utterance-parser'
import { E_000_Linter } from './e_000'

const utterances = [
  'I want to buy fruits',
  'Can I have a [banana](fruit_to_buy) please ?',
  'Please, get me an [apple](fruit_to_buy)',
  'Do you have any [melon](fruit_to_buy) left ?',
  'My personal favorite abstract object is [the concept of cheese](favorite_abstract_object).',
  'I have a strong feeling for the idea of an [apple](favorite_abstract_object).'
]
const cleanedUtterances = utterances.map(parseUtterance).map(({ utterance }) => utterance)

const trainSet: TrainInput = {
  entities: [
    {
      name: 'fruit',
      type: 'list',
      fuzzy: 1,
      values: [
        { name: 'grape', synonyms: [] },
        { name: 'melon', synonyms: ['water-melon'] }
      ]
    }
  ],
  intents: [
    {
      name: 'buy_fruits',
      contexts: ['global'],
      slots: [
        { name: 'fruit_to_buy', entities: ['fruit'] },
        { name: 'favorite_abstract_object', entities: ['fruit', 'any'] }
      ],
      utterances
    }
  ],
  language: 'en',
  seed: 42
}

const fakeTools = makeFakeTools(300, ['en'])

test('linter for E_000 only flags tokens incorrectly tagged as a slot', async () => {
  const lintResults = await E_000_Linter.lint(trainSet, fakeTools)

  expect(lintResults.length).toBe(2)

  expect(lintResults[0].data.utterance).toBe(cleanedUtterances[1])
  expect(lintResults[0].data.slot).toBe('fruit_to_buy')
  expect(lintResults[0].data.source).toBe('banana')

  expect(lintResults[1].data.utterance).toBe(cleanedUtterances[2])
  expect(lintResults[1].data.slot).toBe('fruit_to_buy')
  expect(lintResults[1].data.source).toBe('apple')
})
