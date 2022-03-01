import _ from 'lodash'
import { TrainInput } from '../../typings'
import { makeFakeTools } from '../test-utils/fake-tools'
import { E_004_Linter } from './e_004'

type TestSample = {
  utt: string
  spans: { start: number; end: number }[]
}

const samples: TestSample[] = [
  { utt: 'I want to buy [grapes](fruit_to_buy)', spans: [] },
  { utt: 'I want  to buy [grapes](fruit_to_buy)', spans: [{ start: 7, end: 8 }] },
  { utt: 'I want to   buy [grapes](fruit_to_buy)', spans: [{ start: 10, end: 12 }] },
  { utt: '  I want to buy [grapes](fruit_to_buy)', spans: [{ start: 0, end: 2 }] },
  { utt: 'I want to buy [grapes](fruit_to_buy)  ', spans: [{ start: 36, end: 38 }] },
  {
    utt: '   I want    to buy [grapes](fruit_to_buy)',
    spans: [
      { start: 0, end: 3 },
      { start: 10, end: 13 }
    ]
  }
]

const trainSet: TrainInput = {
  entities: [
    {
      name: 'fruit',
      type: 'list',
      fuzzy: 1,
      values: [
        { name: 'grape', synonyms: ['grapes'] },
        { name: 'melon', synonyms: ['water-melon'] }
      ]
    }
  ],
  intents: [
    {
      name: 'buy_fruits',
      contexts: ['global'],
      slots: [{ name: 'fruit_to_buy', entities: ['fruit'] }],
      utterances: samples.map((s) => s.utt)
    }
  ],
  language: 'en',
  seed: 42
}

const fakeTools = makeFakeTools(300, ['en'])

test('linter for E_004 flags all reduntant spaces', async () => {
  const lintResults = await E_004_Linter.lint(trainSet, fakeTools)

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    const issues = lintResults.filter((r) => r.data.utterance.idx === i)

    for (const [issue, span] of _.zip(issues, sample.spans)) {
      expect(issue?.data.charPos.raw.start).toBe(span?.start)
      expect(issue?.data.charPos.raw.end).toBe(span?.end)
    }
  }
})
