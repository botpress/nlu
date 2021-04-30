export enum LoggerLevel {
  Critical = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4
}

export type LogEntryType = 'log' | 'stacktrace'

export interface LogEntry {
  type: LogEntryType
  level: LoggerLevel
  message: string
  namespace: string
  metadata?: any
  stack?: any
}

export type FormattedLogEntry = LogEntry & {
  formatted: string
}

export interface LogEntryFormatter {
  format(config: LoggerConfig, entry: LogEntry): FormattedLogEntry
}
export interface LogTransporter {
  send(config: LoggerConfig, entry: FormattedLogEntry): Promise<void> | void
}

export interface LoggerConfig {
  level: LoggerLevel
  formatter: LogEntryFormatter
  transports: LogTransporter[]
  timeFormat: string // moment time format
  namespaceDelimiter: string
  colors: { [level: number]: string }
  indent: boolean
  filters: string[]
}
