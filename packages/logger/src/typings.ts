export type Logger = {
  attachError(error: Error): Logger
  configure(config: Partial<LoggerConfig>): void
  debug(message: string, metadata?: any): void
  info(message: string, metadata?: any): void
  warn(message: string, metadata?: any): void
  error(message: string, metadata?: any): void
  critical(message: string, metadata?: any): void
  sub(namespace: string): Logger
}

export type LogEntryType = 'log' | 'stacktrace'
export type LogLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug'

export type LogEntry = {
  type: LogEntryType
  level: LogLevel
  message: string
  namespace: string
  metadata?: any
  stack?: any
}

export type FormattedLogEntry = LogEntry & {
  formatted: string
}

export type LogEntryFormatter = {
  format(config: LoggerConfig, entry: LogEntry): FormattedLogEntry
}

export type LogTransporter = {
  send(config: LoggerConfig, entry: FormattedLogEntry): Promise<void> | void
}

export type LoggerConfig = {
  level: LogLevel
  formatter: LogEntryFormatter
  transports: LogTransporter[]
  timeFormat: string // moment time format
  namespaceDelimiter: string
  colors: Record<LogLevel, string>
  indent: boolean
  filters: Partial<Record<LogLevel, string>>
  prefix: string
}
