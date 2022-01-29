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

export type LogEntry = {
  type: LogEntryType
  level: number
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
  level: number
  formatter: LogEntryFormatter
  transports: LogTransporter[]
  timeFormat: string // moment time format
  namespaceDelimiter: string
  colors: { [level: number]: string }
  indent: boolean
  filters: { [level: number]: string | undefined }
  prefix?: string
}
