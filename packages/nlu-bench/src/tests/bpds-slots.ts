import bitfan from '@botpress/bitfan'
import Bluebird from 'bluebird'
import { Args } from './typings'

const problemMaker = (_bitfan: typeof bitfan) => async (topic: string): Promise<bitfan.Problem<'slot'>> => {
  const fileDef = {
    lang: 'en',
    fileType: <'dataset'>'dataset',
    type: <'slot'>'slot',
    namespace: 'bpds'
  }

  const trainFileDef = { name: `${topic}-train`, ...fileDef }
  const testFileDef = { name: `${topic}-test`, ...fileDef }

  return {
    name: `bpds slot ${topic}`,
    type: 'slot',
    trainSet: await _bitfan.datasets.readDataset(trainFileDef),
    testSet: await _bitfan.datasets.readDataset(testFileDef),
    lang: 'en'
  }
}

export default function (_bitfan: typeof bitfan, args: Args) {
  const avgStrictSlotAccuray = _bitfan.metrics.averageScore(_bitfan.criterias.slotsAre)
  const avgLooseSlotAccuray = _bitfan.metrics.averageScore(_bitfan.criterias.slotIncludes)
  const avgSlotCountAccuray = _bitfan.metrics.averageScore(_bitfan.criterias.slotCountIs)

  const metrics = [avgStrictSlotAccuray, avgLooseSlotAccuray, avgSlotCountAccuray]

  return {
    name: 'bpds-slots',

    computePerformance: async () => {
      const allTopics = [
        'A',
        'B',
        // "C", /* skip C as it involves duckling which slows down regression check */
        'D',
        'E',
        'F',
        'G',
        'H',
        'I'
      ]

      const makeProblem = problemMaker(_bitfan)
      const problems = await Bluebird.map(allTopics, makeProblem)

      const { nluServerEndpoint } = args
      const engine = _bitfan.engines.makeBpSlotEngine(nluServerEndpoint)

      const solution = {
        name: 'bpds slot',
        problems,
        engine
      }

      const seeds = [42]
      const results = await _bitfan.runSolution(solution, seeds)

      const report = _bitfan.evaluateMetrics(results, metrics)
      _bitfan.visualisation.showPerformanceReport(report)
      // bitfan.visualisation.showSlotsResults(results);

      return report
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [avgStrictSlotAccuray.name]: 0.02,
        [avgLooseSlotAccuray.name]: 0.02,
        [avgSlotCountAccuray.name]: 0.02
      }
      return _bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
