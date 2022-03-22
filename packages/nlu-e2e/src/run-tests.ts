import { Logger } from '@botpress/logger'
import { Client as NLUClient } from '@botpress/nlu-client'

import _ from 'lodash'
import { nanoid } from 'nanoid'
import { assertModelsAreEmpty, assertServerIsReachable } from './assertions'
import { clinc50_42_dataset, clinc50_666_dataset, grocery_dataset } from './datasets'
import tests from './tests'
import { AssertionArgs, Test } from './typings'
import { syncE2ECachePath } from './utils'

type CommandLineArgs = {
  nluEndpoint: string
  pattern?: string
}

export const runTests = async (cliArgs: CommandLineArgs) => {
  const { nluEndpoint, pattern } = cliArgs

  const appId = `${nanoid()}/e2e-tests/${nanoid()}`
  const logger = new Logger('e2e', {
    level: 'debug'
  })

  logger.info(`Running e2e tests on server located at "${nluEndpoint}"`)
  await syncE2ECachePath(logger, appId)

  const client = new NLUClient({
    baseURL: nluEndpoint
  })
  const args: AssertionArgs = { logger, appId, client }

  const requiredLanguages = [clinc50_42_dataset, clinc50_666_dataset, grocery_dataset].map((ts) => ts.language)

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
