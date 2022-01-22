import { makeLogger, LoggerLevel } from '@botpress/logger'
import { Client as NLUClient } from '@botpress/nlu-client'

import _ from 'lodash'
import { nanoid } from 'nanoid'
import { assertModelsAreEmpty, assertServerIsReachable } from './assertions'
import { clinc150_42_dataset, clinc150_666_dataset, grocery_dataset } from './datasets'
import tests from './tests'
import { AssertionArgs, Test } from './typings'

type CommandLineArgs = {
  nluEndpoint: string
  pattern?: string
}

export const runTests = async (cliArgs: CommandLineArgs) => {
  const { nluEndpoint, pattern } = cliArgs

  const appId = nanoid()
  const logger = makeLogger({
    level: LoggerLevel.Debug
  }).sub('e2e')

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

  let testToRun: Test[] = tests
  if (pattern) {
    const rgx = new RegExp(pattern)
    testToRun = tests.filter(({ name }) => rgx.exec(name))
  }

  for (const test of testToRun) {
    await test.handler(args)
  }
}
