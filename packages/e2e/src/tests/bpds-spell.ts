import _bitfan, { DataSetDef, DocumentDef, UnsupervisedProblem, Result } from '@botpress/bitfan'
import chalk from 'chalk'
import yn from 'yn'

const orange = chalk.rgb(255, 150, 50)

const debugResults = (results: Result<'spell'>[]) => {
  for (const r of results) {
    const { elected } = r.candidates[0]
    const success = elected === r.label ? chalk.green('PASS') : chalk.red('FAIL')
    const formatted = `[${success}] ${orange(r.text)} -> ${chalk.yellowBright(elected)} | ${chalk.blueBright(r.label)}`
    console.log(formatted)
  }
}

export default function (bitfan: typeof _bitfan) {
  const metrics = [bitfan.metrics.accuracy]

  return {
    name: 'bpds-spell',

    computePerformance: async () => {
      const nluServerEndpoint = process.env.NLU_SERVER_ENDPOINT ?? 'http://localhost:3200'
      const password = '123456'
      const engine = bitfan.engines.makeBpSpellEngine(nluServerEndpoint, password)

      const trainFileDef: DocumentDef = {
        name: 'A-train',
        lang: 'en',
        fileType: 'document',
        type: 'spell',
        namespace: 'bpds'
      }

      const testFileDef: DataSetDef<'spell'> = {
        name: 'A-test',
        lang: 'en',
        fileType: 'dataset',
        type: 'spell',
        namespace: 'bpds'
      }

      const problem: UnsupervisedProblem<'spell'> = {
        name: 'bpds A spelling',
        type: 'spell',
        corpus: [await bitfan.datasets.readDocument(trainFileDef)],
        testSet: await bitfan.datasets.readDataset(testFileDef),
        lang: 'en'
      }

      const results = await bitfan.runSolution(
        {
          name: 'bpds spelling',
          problems: [problem],
          engine
        },
        [42]
      )

      const performanceReport = bitfan.evaluateMetrics(results, metrics)
      bitfan.visualisation.showPerformanceReport(performanceReport)

      yn(process.env.DEBUG_RESULTS) && debugResults(results)

      return performanceReport
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [bitfan.metrics.accuracy.name]: 0.02
      }
      return bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
