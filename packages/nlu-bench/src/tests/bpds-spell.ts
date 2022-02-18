import bitfan, { DataSetDef, DocumentDef, UnsupervisedProblem, Result } from '@botpress/bitfan'
import chalk from 'chalk'
import yn from 'yn'
import { Args } from './typings'

const orange = chalk.rgb(255, 150, 50)

const debugResults = (results: Result<'spell'>[]) => {
  let i = 0
  for (const r of results) {
    const { elected } = r.candidates[0]
    const success = elected === r.label ? chalk.green('PASS') : chalk.red('FAIL')
    const formatted = `${i++}. [${success}] ${orange(r.text)} -> ${chalk.yellowBright(elected)} | ${chalk.blueBright(
      r.label
    )}`
    // eslint-disable-next-line no-console
    console.log(formatted)
  }
}

export default function (_bitfan: typeof bitfan, args: Args) {
  const metrics = [_bitfan.metrics.accuracy]

  return {
    name: 'bpds-spell',

    computePerformance: async () => {
      const { nluServerEndpoint } = args
      const engine = _bitfan.engines.makeBpSpellEngine(nluServerEndpoint)

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
        corpus: [await _bitfan.datasets.readDocument(trainFileDef)],
        testSet: await _bitfan.datasets.readDataset(testFileDef),
        lang: 'en'
      }

      const results = await _bitfan.runSolution(
        {
          name: 'bpds spelling',
          problems: [problem],
          engine
        },
        [42]
      )

      const performanceReport = _bitfan.evaluateMetrics(results, metrics)
      _bitfan.visualisation.showPerformanceReport(performanceReport)

      yn(process.env.DEBUG_RESULTS) && debugResults(results)

      return performanceReport
    },

    evaluatePerformance: (currentPerformance, previousPerformance) => {
      const toleranceByMetric = {
        [_bitfan.metrics.accuracy.name]: 0.02
      }
      return _bitfan.comparePerformances(currentPerformance, previousPerformance, { toleranceByMetric })
    }
  }
}
