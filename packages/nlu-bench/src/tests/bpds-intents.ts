import bitfan from '@botpress/bitfan'
import { Args } from './typings'

const problemMaker = (_bitfan: typeof bitfan) => async (
  name: string,
  lang: string,
  trainSet: string,
  testSet: string
): Promise<bitfan.Problem<'intent'>> => {
  const fileDef = {
    lang,
    fileType: <'dataset'>'dataset',
    type: <'intent'>'intent',
    namespace: 'bpds'
  }
  const trainFileDef = { name: trainSet, ...fileDef }
  const testFileDef = { name: testSet, ...fileDef }

  return {
    name,
    type: 'intent',
    trainSet: await _bitfan.datasets.readDataset(trainFileDef),
    testSet: await _bitfan.datasets.readDataset(testFileDef),
    lang
  }
}

export default function (_bitfan: typeof bitfan, args: Args) {
  const metrics = [
    _bitfan.metrics.accuracy,
    _bitfan.metrics.oosAccuracy,
    _bitfan.metrics.oosPrecision,
    _bitfan.metrics.oosRecall,
    _bitfan.metrics.oosF1
  ]

  return {
    name: 'bpds-intent',

    computePerformance: async () => {
      const makeProblem = problemMaker(_bitfan)
      let problems = [
        await makeProblem('bpsd A-en', 'en', 'A-train', 'A-test'),
        await makeProblem('bpds A imbalanced-en', 'en', 'A-imbalanced-train', 'A-test'),
        await makeProblem('bpds A fewshot-en', 'en', 'A-fewshot-train', 'A-test'),
        await makeProblem('bpds B', 'en', 'B-train', 'B-test'),
        await makeProblem('bpsd A-fr', 'fr', 'A-train', 'A-test'),
        await makeProblem('bpds A imbalanced-fr', 'fr', 'A-imbalanced-train', 'A-test'),
        await makeProblem('bpds A fewshot-fr', 'fr', 'A-fewshot-train', 'A-test')
      ]

      const usedLang = process.env.BITFAN_LANG
      if (usedLang) {
        problems = problems.filter((p) => p.lang === usedLang)
      }

      const { nluServerEndpoint } = args
      const engine = _bitfan.engines.makeBpIntentEngine(nluServerEndpoint)

      const solution: bitfan.Solution<'intent'> = {
        name: 'bpds intent',
        problems,
        engine
      }

      const seeds = [42, 69, 666]
      const results = await _bitfan.runSolution(solution, seeds)

      const performanceReport = _bitfan.evaluateMetrics(results, metrics)

      await _bitfan.visualisation.showPerformanceReport(performanceReport, { groupBy: 'seed' })
      await _bitfan.visualisation.showPerformanceReport(performanceReport, { groupBy: 'problem' })
      await _bitfan.visualisation.showOOSConfusion(results)

      return performanceReport
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [_bitfan.metrics.accuracy.name]: 0.075,
        [_bitfan.metrics.oosAccuracy.name]: 0.075,
        [_bitfan.metrics.oosPrecision.name]: 0.075,
        [_bitfan.metrics.oosRecall.name]: 0.075,
        [_bitfan.metrics.oosF1.name]: 0.15 // more tolerance for f1 score
      }
      return _bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
