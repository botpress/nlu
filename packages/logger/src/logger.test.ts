import { Logger, LoggerLevel } from '.'
import { FormattedLogEntry, LogEntry, LogEntryFormatter, LoggerConfig, LogTransporter } from './typings'

type Call = { config: LoggerConfig; entry: FormattedLogEntry }
class FakeTransporter implements LogTransporter {
  public readonly calls: Call[] = []
  public send(config: LoggerConfig, entry: FormattedLogEntry): void | Promise<void> {
    this.calls.push({ config, entry })
  }
  public get criticals() {
    return this.calls.filter((c) => c.entry.level === LoggerLevel.Critical)
  }
  public get errors() {
    return this.calls.filter((c) => c.entry.level === LoggerLevel.Error)
  }
  public get warnings() {
    return this.calls.filter((c) => c.entry.level === LoggerLevel.Warn)
  }
  public get infos() {
    return this.calls.filter((c) => c.entry.level === LoggerLevel.Info)
  }
  public get debugs() {
    return this.calls.filter((c) => c.entry.level === LoggerLevel.Debug)
  }
  public hasMessage(msg: string) {
    return this.calls.map((c) => c.entry.formatted).includes(msg)
  }
}

class FakeFormatter implements LogEntryFormatter {
  public format(config: LoggerConfig, entry: LogEntry): FormattedLogEntry {
    return { ...entry, formatted: entry.message }
  }
}

const formatter = new FakeFormatter()
const makeLogger = (namespace: string, config?: Partial<LoggerConfig>, delimiter = ':') => {
  let logger = new Logger()
  const namespaces = namespace.split(delimiter)
  for (const ns of namespaces) {
    logger = logger.sub(ns)
  }
  if (config) {
    logger.configure({ ...config, formatter })
  } else {
    logger.configure({ formatter })
  }
  return logger
}

test('when debug level and no filters, all logs are sent', () => {
  // arrange
  const transporter = new FakeTransporter()
  const logger = makeLogger('some:namespace', { transports: [transporter], level: LoggerLevel.Debug })

  // act
  logger.critical('critical log')
  logger.error('error log')
  logger.warn('warn log')
  logger.info('info log')
  logger.debug('debug log')

  // assert
  expect(transporter.criticals).toHaveLength(1)
  expect(transporter.errors).toHaveLength(1)
  expect(transporter.warnings).toHaveLength(1)
  expect(transporter.infos).toHaveLength(1)
  expect(transporter.debugs).toHaveLength(1)
})

test('when warning level and no filters, debugs and info are not sent', () => {
  // arrange
  const transporter = new FakeTransporter()
  const logger = makeLogger('some:namespace', { transports: [transporter], level: LoggerLevel.Warn })

  // act
  logger.critical('critical log')
  logger.error('error log')
  logger.warn('warn log')
  logger.info('info log')
  logger.debug('debug log')

  // assert
  expect(transporter.criticals).toHaveLength(1)
  expect(transporter.errors).toHaveLength(1)
  expect(transporter.warnings).toHaveLength(1)
  expect(transporter.infos).toHaveLength(0)
  expect(transporter.debugs).toHaveLength(0)
})

test('when filter is set on a scope, it only applies on the scope', () => {
  // arrange
  const transporter = new FakeTransporter()
  const logger = makeLogger('some:namespace', {
    transports: [transporter],
    level: LoggerLevel.Debug,
    filters: { [LoggerLevel.Warn]: 'lol' }
  })

  // act
  logger.critical('critical log')
  logger.error('error log')
  logger.warn('warn log')
  logger.info('info log')
  logger.debug('debug log')

  // assert
  expect(transporter.criticals).toHaveLength(1)
  expect(transporter.errors).toHaveLength(1)
  expect(transporter.warnings).toHaveLength(0)
  expect(transporter.infos).toHaveLength(1)
  expect(transporter.debugs).toHaveLength(1)
})

test('when filter is set, all namespace must conform for the log to be sent', () => {
  // arrange
  const transporter = new FakeTransporter()
  const helloLogger = new Logger('hello', {
    filters: { [LoggerLevel.Info]: '^hello$|^hello:world$' },
    transports: [transporter],
    formatter
  })
  const helloWorldLogger = helloLogger.sub('world')
  const helloWorldFlowersLogger = helloWorldLogger.sub('flowers')

  // act
  helloLogger.info('message 1')
  helloWorldLogger.info('message 2')
  helloWorldFlowersLogger.info('message 3')

  // assert
  expect(transporter.hasMessage('message 1')).toBe(true)
  expect(transporter.hasMessage('message 2')).toBe(true)
  expect(transporter.hasMessage('message 3')).toBe(false)
})

test('filter can work with a blacklist', () => {
  // arrange
  const transporter = new FakeTransporter()
  const helloLogger = new Logger('hello', {
    filters: { [LoggerLevel.Info]: '^(?!hello:world:flowers:rainbow).*$' },
    transports: [transporter],
    formatter
  })
  const helloWorldLogger = helloLogger.sub('world')
  const helloWorldFlowersLogger = helloWorldLogger.sub('flowers')
  const helloWorldFlowersRainbowsLogger = helloWorldFlowersLogger.sub('rainbow')
  const helloWorldFlowersRainbowsSunshineLogger = helloWorldFlowersRainbowsLogger.sub('sunshine')

  // act
  helloLogger.info('message 1')
  helloWorldLogger.info('message 2')
  helloWorldFlowersLogger.info('message 3')
  helloWorldFlowersRainbowsLogger.info('message 4')
  helloWorldFlowersRainbowsSunshineLogger.info('message 5')

  // assert
  expect(transporter.hasMessage('message 1')).toBe(true)
  expect(transporter.hasMessage('message 2')).toBe(true)
  expect(transporter.hasMessage('message 3')).toBe(true)
  expect(transporter.hasMessage('message 4')).toBe(false)
  expect(transporter.hasMessage('message 5')).toBe(false)
})
