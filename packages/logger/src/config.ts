import { TextFormatter } from './formatters/text'
import { ConsoleTransport } from './transports/console'
import { LoggerConfig } from './typings'

export const defaultConfig: LoggerConfig = {
  level: 'info',
  timeFormat: 'L HH:mm:ss.SSS',
  namespaceDelimiter: ':',
  colors: {
    debug: 'blue',
    info: 'green',
    warning: 'yellow',
    error: 'red',
    critical: [0x8b, 0, 0]
  },
  formatter: new TextFormatter(),
  transports: [new ConsoleTransport()],
  indent: false,
  filters: {}, // show all logs
  prefix: ''
}
