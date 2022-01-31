import { TextFormatter } from './formatters/text'
import { ConsoleTransport } from './transports/console'
import { LoggerConfig } from './typings'

export enum LoggerLevel {
  Critical = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4
}

export const defaultConfig: LoggerConfig = {
  level: LoggerLevel.Info,
  timeFormat: 'L HH:mm:ss.SSS',
  namespaceDelimiter: ':',
  colors: {
    [LoggerLevel.Debug]: 'blue',
    [LoggerLevel.Info]: 'green',
    [LoggerLevel.Warn]: 'yellow',
    [LoggerLevel.Error]: 'red',
    [LoggerLevel.Critical]: 'red'
  },
  formatter: new TextFormatter(),
  transports: [new ConsoleTransport()],
  indent: false,
  filters: {}, // show all logs
  prefix: ''
}
