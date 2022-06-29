import { Client as NLUClient } from '@botpress/nlu-client'
import { Logger } from '@bpinternal/log4bot'

export type AssertionArgs = {
  client: NLUClient
  logger: Logger
  appId: string
}

export type TestHandler = (args: AssertionArgs) => Promise<void>

export type Test = {
  name: string
  handler: TestHandler
}
