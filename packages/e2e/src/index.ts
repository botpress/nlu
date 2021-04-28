import bitfan from '@botpress/bitfan'
import chalk from 'chalk'
import { updateResults, readResults } from './score-service'
import bpdsIntents from './tests/bpds-intents'
import bpdsSlots from './tests/bpds-slots'
import bpdsSpell from './tests/bpds-spell'
import clincIntents from './tests/clinc-intents'

async function runTest(test, { update, keepGoing }) {
  const { name, computePerformance, evaluatePerformance } = test(bitfan)
  const performance = await computePerformance()

  if (update) {
    await updateResults(name, performance)
    return true
  }

  const previousPerformance = await readResults(name)
  const comparison = evaluatePerformance(performance, previousPerformance)

  bitfan.visualisation.showComparisonReport(name, comparison)
  // eslint-disable-next-line no-console
  console.log('')

  if (comparison.status === 'regression') {
    if (!keepGoing) {
      throw new Error('Regression')
    }
    // eslint-disable-next-line no-console
    console.log(chalk.gray('Skipping to next test...\n'))
    return false
  }

  if (comparison.status !== 'success') {
    return true
  }

  return true
}

async function main(args) {
  const update = args.includes('--update') || args.includes('-u')
  const keepGoing = args.includes('--keep-going') || args.includes('-k')

  const tests = [bpdsIntents, bpdsSlots, bpdsSpell, clincIntents]

  let testsPass = true
  for (const test of tests) {
    const currentTestPass = await runTest(test, { update, keepGoing })
    testsPass = testsPass && currentTestPass
  }

  if (update) {
    // eslint-disable-next-line no-console
    console.log(chalk.green('Test results where update with success.'))
    return
  }

  if (!testsPass) {
    throw new Error('There was a regression in at least one test.')
  }
}

main(process.argv.slice(2))
  .then(() => {})
  .catch((err) => {
    console.error(chalk.red('The following error occured:\n'), err)
    process.exit(1)
  })
