import * as sdk from 'bitfan/sdk'
import chalk from 'chalk'
import _ from 'lodash'
import { roundTable } from '../tables/round'
import { tabelize } from '../tables/tabelize'

const DEFAULT_OPT: {
  groupBy: 'seed' | 'problem' | 'all'
} = {
  groupBy: 'all'
}

export const showPerformanceReport: typeof sdk.visualisation.showPerformanceReport = (
  report: sdk.PerformanceReport,
  opt?: Partial<{
    groupBy: 'seed' | 'problem' | 'all'
  }>
) => {
  const options = { ...DEFAULT_OPT, ...(opt ?? {}) }

  let table = tabelize(report.scores, {
    row: (s) => s.metric,
    column: (s) => (options.groupBy === 'seed' ? `${s.seed}` : options.groupBy === 'problem' ? s.problem : 'all'),
    score: (s) => s.score
  })
  table = roundTable(table)

  console.log(chalk.green('Report Summary: '))
  console.table(table)
}

function logReason(reason: sdk.RegressionReason) {
  const { status, seed, problem, metric, currentScore, previousScore, allowedRegression } = reason

  let msg =
    ` - For problem "${problem}", for seed "${seed}", for metric "${metric}",\n` +
    `   current score is ${currentScore}, while previous score is ${previousScore}`

  if (status === 'regression') {
    msg += ` (allowed regression is ${allowedRegression})`
    console.log(chalk.red(msg))
  } else if (status === 'tolerated-regression') {
    msg += '.'
    console.log(chalk.yellow(msg))
  }
}

export const showComparisonReport: typeof sdk.visualisation.showComparisonReport = (
  name: string,
  comparison: sdk.ComparisonReport
) => {
  if (comparison.status === 'regression') {
    console.log(chalk.red(`There seems to be a regression on test ${name}.\n` + 'Reasons are:\n'))
  }
  if (comparison.status === 'tolerated-regression') {
    console.log(
      chalk.yellow(
        `There seems to be a regression on test ${name}, but regression is small enough to be tolerated.\n` +
          'Reasons are:\n'
      )
    )
  }
  if (comparison.status === 'success') {
    console.log(chalk.green(`No regression noted for test ${name}.`))
  }
  comparison.reasons.forEach(logReason)
}
