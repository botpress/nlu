import { PredictorOf } from 'src/component'
import { Logger } from 'src/typings'
import * as MLToolkit from '../../ml/toolkit'
import { tokenizeLatinTextForTests } from '../test-utils/fake-tools'

import { isSpace } from '../tools/token-utils'

import { fallbackTagger, getPOSTagger, tagSentence } from './pos-tagger'

const dummyLogger: Partial<Logger> = { debug: () => {} }

describe('POS Tagger', () => {
  test('Fallback tagger returns NA tags properly', async () => {
    const feats = [['feat1=1', 'feat2'], ['feat1=2'], ['feat1=3', 'feat2']]
    const { probability, result: tags } = await fallbackTagger.predict(feats)
    expect(probability).toEqual(1)
    expect(tags.every((t) => t === 'N/A')).toBeTruthy()
  })

  test('Get tagger returns FB tagger for other languages than english', async () => {
    const tagger = await getPOSTagger('', 'de', {} as typeof MLToolkit, dummyLogger as Logger)
    expect(tagger).toEqual(fallbackTagger)
  })

  describe('tagSentence', () => {
    const mockedTagger = {
      ...fallbackTagger,
      predict: jest.fn((xseq) => fallbackTagger.predict(xseq))
    }

    test('Calls tagger without spaces and adds _ for space tokens', async () => {
      const xseq = tokenizeLatinTextForTests(
        'A Sea Fox is a Fox-alien-fish crossbreed with a strange amalgamation of a bunch of different animals and plants'
      )
      const n_space = xseq.filter((t) => isSpace(t)).length

      const tags = await tagSentence(mockedTagger as PredictorOf<MLToolkit.CRF.Tagger>, xseq)
      expect(mockedTagger.predict.mock.calls[0][0].length).toEqual(xseq.length - n_space)
      expect(tags.filter((t) => isSpace(t)).length).toEqual(n_space)
      tags
        .filter((t) => !isSpace(t))
        .forEach((t) => {
          expect(t).toEqual('N/A') // return value of the mocked tagger
        })
    })
  })
})
