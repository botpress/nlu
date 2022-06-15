import { Logger } from '@bpinternal/log4bot'
import tests from './tests'

export const listTests = () => {
  const logger = new Logger('e2e', {
    level: 'debug'
  })

  logger.info('Available tests are:')
  for (const test of tests) {
    logger.info(`- ${test.name}`)
  }
}
