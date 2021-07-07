import { readFileSync, writeFileSync } from 'fs'
import _ from 'lodash'
import tmp from 'tmp'
import { MLToolkit } from '../../ml/typings'
import { Predictors } from '../predict-pipeline'

const NA_LANG = 'n/a'

export class FastTextLanguageId {
  private static model: MLToolkit.FastText.Model
  private static toolkit: typeof MLToolkit

  constructor(toolkit: typeof MLToolkit) {
    FastTextLanguageId.toolkit = toolkit
  }

  public async initializeModel(preTrainedModelPath: string) {
    const tmpFn = tmp.tmpNameSync({ postfix: '.ftz' })
    const modelBuff = readFileSync(preTrainedModelPath)
    writeFileSync(tmpFn, modelBuff)
    const ft = new FastTextLanguageId.toolkit.FastText.Model()
    await ft.loadFromFile(tmpFn)
    FastTextLanguageId.model = ft
  }

  async identify(text: string): Promise<MLToolkit.FastText.PredictResult[]> {
    if (!FastTextLanguageId.model) {
      return []
    }

    return (await FastTextLanguageId.model.predict(text, 3))
      .map((pred) => ({
        ...pred,
        label: pred.label.replace('__label__', '')
      }))
      .sort((predA, predB) => predB.value - predA.value) // descending
  }
}

export default (langIdentifier: FastTextLanguageId) => async (
  sentence: string,
  predictorsByLang: _.Dictionary<Predictors>
): Promise<string> => {
  const supportedLanguages = Object.keys(predictorsByLang)

  const bestMlLangMatch = (await langIdentifier.identify(sentence))[0]
  let detectedLanguage = bestMlLangMatch?.label ?? NA_LANG
  let scoreDetectedLang = bestMlLangMatch?.value ?? 0

  // because with single-worded sentences, confidence is always very low
  // we assume that a input of 20 chars is more than a single word
  const threshold = sentence.length > 20 ? 0.5 : 0.3

  // if ML-based language identifier didn't find a match
  // we proceed with a custom vocabulary matching algorithm
  // ie. the % of the sentence comprised of tokens in the training vocabulary
  if (scoreDetectedLang <= threshold) {
    try {
      const match = _.chain(supportedLanguages)
        .map((lang) => ({
          lang,
          sentence: sentence.toLowerCase(),
          tokens: _.orderBy(predictorsByLang[lang].vocab, 'length', 'desc')
        }))
        .map(({ lang, sentence, tokens }) => {
          for (const token of tokens) {
            sentence = sentence.replace(token, '')
          }
          return { lang, confidence: 1 - sentence.length / sentence.length }
        })
        .filter((x) => x.confidence >= threshold)
        .orderBy('confidence', 'desc')
        .first()
        .value()

      if (match) {
        detectedLanguage = match.lang
        scoreDetectedLang = match.confidence
      }
    } finally {
    }
  }

  return detectedLanguage
}
