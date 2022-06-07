import bitfan from '@botpress/bitfan'
import chalk from 'chalk'
import yargs from 'yargs'
import { updateResults, readResults } from './score-service'
import bpdsIntents from './tests/bpds-intents'
import bpdsSlots from './tests/bpds-slots'
import bpdsSpell from './tests/bpds-spell'
import clincIntents from './tests/clinc-intents'

async function runTest(test, { update, keepGoing }) {
  const { name, computePerformance, evaluatePerformance } = test
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

interface CommandLineArgs {
  update: boolean
  keepGoing: boolean
  tests?: string
  skip?: string
}

function getTests(tests: string | undefined, skip: string | undefined) {
  const allTests = [bpdsIntents, bpdsSlots, bpdsSpell, clincIntents].map((t) => t(bitfan))
  if (skip && tests) {
    console.log(chalk.yellow('Both --skip and --tests flags are set; Ignoring --skip flag.'))
  }

  if (tests) {
    const testsRegexp = new RegExp(tests)
    return allTests.filter(({ name }) => testsRegexp.exec(name))
  }
  if (skip) {
    const skipRegexp = new RegExp(skip)
    return allTests.filter(({ name }) => !skipRegexp.exec(name))
  }
  return allTests
}

async function main(args: CommandLineArgs) {
  const { update, skip, keepGoing, tests: testsToRun } = args

  const tests = getTests(testsToRun, skip)
  console.log(chalk.green(`Running tests [${tests.map(({ name }) => name).join(', ')}]`))

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
    console.log(chalk.red('There was a regression in at least one test.'))
  }
}

yargs
  .command(
    ['e2e', '$0'],
    'Launch e2e tests on nlu-server',
    {
      update: {
        alias: 'u',
        description: 'Whether or not to update latest results',
        default: false,
        type: 'boolean'
      },
      keepGoing: {
        alias: 'k',
        description: 'Whether or not to keep going on all tests when a regression is detected',
        default: false,
        type: 'boolean'
      },
      tests: {
        alias: 't',
        description: 'Regexp pattern string for tests to run',
        type: 'string'
      },
      skip: {
        description: 'Regexp pattern string for tests to skip. Ignored if tests is set.',
        type: 'string'
      }
    },
    (argv) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      main(argv)
        .then(() => {})
        .catch((err) => {
          console.error(chalk.red('The following error occured:\n'), err)
          process.exit(1)
        })
    }
  )
  .help().argv
