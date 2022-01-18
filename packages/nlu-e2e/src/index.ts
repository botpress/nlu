import { makeLogger, LoggerLevel } from '@botpress/logger'
import { Client as NLUClient } from '@botpress/nlu-client'
import chalk from 'chalk'

import _ from 'lodash'
import { nanoid } from 'nanoid'
import yargs from 'yargs'
import { AssertionArgs, assertModelsAreEmpty, assertServerIsReachable } from './assertions'
import { clinc150_42_dataset, clinc150_666_dataset, grocery_dataset } from './datasets'
import tests from './tests'

type CommandLineArgs = {
  nluEndpoint: string
}

const appId = nanoid()
const logger = makeLogger({
  level: LoggerLevel.Debug
}).sub('e2e')

const main = async (cliArgs: CommandLineArgs) => {
  const { nluEndpoint } = cliArgs
  logger.info(`Running e2e tests on server located at "${nluEndpoint}"`)

  const client = new NLUClient({
    baseURL: nluEndpoint
  })
  const args: AssertionArgs = { logger, appId, client }

  const requiredLanguages = [clinc150_42_dataset, clinc150_666_dataset, grocery_dataset].map((ts) => ts.language)

  const baseLogger = logger.sub('base')
  const baseArgs = { ...args, logger: baseLogger }
  await assertServerIsReachable(baseArgs, requiredLanguages)
  await assertModelsAreEmpty(baseArgs)

  for (const test of tests) {
    await test(args)
  }
}

yargs
  .command(
    ['test', '$0'],
    'Launch e2e tests on nlu-server',
    {
      nluEndpoint: {
        type: 'string',
        required: true
      }
    },
    (argv) => {
      void main(argv)
        .then(() => {})
        .catch((err) => {
          console.error(chalk.red('Test failed for the following reason:\n'), err)
          process.exit(1)
        })
    }
  )
  .help().argv
