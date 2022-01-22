import chalk from 'chalk'
import yargs from 'yargs'
import { listTests } from './ls-tests'
import { runTests } from './run-tests'

yargs
  .command(
    ['test', '$0'],
    'Launch e2e tests on nlu-server',
    {
      nluEndpoint: {
        type: 'string',
        alias: 'e',
        required: true,
        default: 'http://localhost:3200'
      },
      pattern: {
        type: 'string',
        alias: 'p',
        optionnal: true
      }
    },
    (argv) => {
      void runTests(argv)
        .then(() => {})
        .catch((err) => {
          console.error(chalk.red('Test failed for the following reason:\n'), err)
          process.exit(1)
        })
    }
  )
  .command(['list', 'ls'], 'List available tests', {}, (argv) => {
    listTests()
  })
  .help().argv
