import bitfan from '@botpress/bitfan'
import { Args } from './typings'

const problemMaker = (_bitfan: typeof bitfan) => async (name: string, trainSet: string, testSet: string) => {
  const fileDef = {
    lang: 'en',
    fileType: <'dataset'>'dataset',
    type: <'intent'>'intent',
    namespace: ''
  }
  const trainFileDef = { name: trainSet, ...fileDef }
  const testFileDef = { name: testSet, ...fileDef }

  return {
    name,
    type: <'intent'>'intent',
    trainSet: await _bitfan.datasets.readDataset(trainFileDef),
    testSet: await _bitfan.datasets.readDataset(testFileDef),
    lang: 'en'
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
    name: 'clinc150',

    computePerformance: async () => {
      const { nluServerEndpoint } = args
      const engine = _bitfan.engines.makeBpIntentEngine(nluServerEndpoint)

      const makeProblem = problemMaker(_bitfan)

      const results = await _bitfan.runSolution(
        {
          name: 'bpds intent',
          problems: [
            await makeProblem('clinc150, 20 utt/intent, seed 42', 'clinc150_20_42-train', 'clinc150_100-test')
          ],
          engine
        },
        [42]
      )

      const performanceReport = _bitfan.evaluateMetrics(results, metrics)
      await _bitfan.visualisation.showPerformanceReport(performanceReport, { groupBy: 'problem' })
      await _bitfan.visualisation.showOOSConfusion(results)

      return performanceReport
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [_bitfan.metrics.accuracy.name]: 0.05,
        [_bitfan.metrics.oosAccuracy.name]: 0.05,
        [_bitfan.metrics.oosPrecision.name]: 0.1,
        [_bitfan.metrics.oosRecall.name]: 0.1,
        [_bitfan.metrics.oosF1.name]: 0.15 // more tolerance for f1 score
      }
      return _bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
