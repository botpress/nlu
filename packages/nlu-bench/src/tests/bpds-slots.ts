import Bluebird from 'bluebird'

const problemMaker = (bitfan) => async (topic) => {
  const fileDef = {
    lang: 'en',
    fileType: 'dataset',
    type: 'slot',
    namespace: 'bpds'
  }

  const trainFileDef = { name: `${topic}-train`, ...fileDef }
  const testFileDef = { name: `${topic}-test`, ...fileDef }

  return {
    name: `bpds slot ${topic}`,
    type: 'slot',
    trainSet: await bitfan.datasets.readDataset(trainFileDef),
    testSet: await bitfan.datasets.readDataset(testFileDef),
    lang: 'en'
  }
}

export default function (bitfan) {
  const avgStrictSlotAccuray = bitfan.metrics.averageScore(bitfan.criterias.slotsAre)
  const avgLooseSlotAccuray = bitfan.metrics.averageScore(bitfan.criterias.slotIncludes)
  const avgSlotCountAccuray = bitfan.metrics.averageScore(bitfan.criterias.slotCountIs)

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

      const makeProblem = problemMaker(bitfan)
      const problems = await Bluebird.map(allTopics, makeProblem)

      const nluServerEndpoint = process.env.NLU_SERVER_ENDPOINT ?? 'http://localhost:3200'
      const password = '123456'
      const engine = bitfan.engines.makeBpSlotEngine(nluServerEndpoint, password)

      const solution = {
        name: 'bpds slot',
        problems,
        engine
      }

      const seeds = [42]
      const results = await bitfan.runSolution(solution, seeds)

      const report = bitfan.evaluateMetrics(results, metrics)
      bitfan.visualisation.showPerformanceReport(report)
      // bitfan.visualisation.showSlotsResults(results);

      return report
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [avgStrictSlotAccuray.name]: 0.02,
        [avgLooseSlotAccuray.name]: 0.02,
        [avgSlotCountAccuray.name]: 0.02
      }
      return bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
