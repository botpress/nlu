import { makeLogger, LoggerLevel } from '@botpress/logger'
import tests from './tests'

export const listTests = () => {
  const logger = makeLogger({
    level: LoggerLevel.Debug
  }).sub('e2e')

  logger.info('Available tests are:')
  for (const test of tests) {
    logger.info(`- ${test.name}`)
  }
}
