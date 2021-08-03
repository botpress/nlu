import { Logger as EngineLogger } from '@botpress/nlu-engine'
import { Logger } from './typings'

export const wrapLogger = (logger: Logger): EngineLogger => {
  return {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg)),
    sub: (namespace: string) => wrapLogger(logger.sub(namespace))
  }
}
