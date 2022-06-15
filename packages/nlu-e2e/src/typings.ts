import { Logger } from '@bpinternal/log4bot'
import { Client as NLUClient } from '@botpress/nlu-client'

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
