import { Logger } from '@bpinternal/log4bot'

export const listenForUncaughtErrors = (logger: Logger) => {
  process.on('unhandledRejection', (thrown: any) => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    logger.critical(`Unhandled rejection: "${err.message}"`)
  })

  process.on('uncaughtException', (thrown: Error) => {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    logger.critical(`Uncaught exceptions: "${err.message}"`)
  })
}
