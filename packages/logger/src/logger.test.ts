import { Logger } from '.'
import { FormattedLogEntry, LogEntry, LogEntryFormatter, LoggerConfig, LogTransporter } from './typings'

type Call = { config: LoggerConfig; entry: FormattedLogEntry }
class FakeTransporter implements LogTransporter {
  public readonly calls: Call[] = []
  public send(config: LoggerConfig, entry: FormattedLogEntry): void | Promise<void> {
    this.calls.push({ config, entry })
  }
  public get criticals() {
    return this.calls.filter((c) => c.entry.level === 'critical')
  }
  public get errors() {
    return this.calls.filter((c) => c.entry.level === 'error')
  }
  public get warnings() {
    return this.calls.filter((c) => c.entry.level === 'warning')
  }
  public get infos() {
    return this.calls.filter((c) => c.entry.level === 'info')
  }
  public get debugs() {
    return this.calls.filter((c) => c.entry.level === 'debug')
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

test('filter can work with a blacklist', () => {
  // arrange
  const transporter = new FakeTransporter()
  const helloLogger = new Logger('hello', {
    filters: { info: '^(?!hello:world:flowers:rainbow).*$' },
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
