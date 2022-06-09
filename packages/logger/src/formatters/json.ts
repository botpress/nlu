import { FormattedLogEntry, LogEntry, LogEntryFormatter, LoggerConfig } from '../typings'

export class JSONFormatter implements LogEntryFormatter {
  constructor() {}
  public format(config: LoggerConfig, entry: LogEntry): FormattedLogEntry {
    const { prefix } = config
    const { namespace, level, type, message, stack, metadata } = entry
    return {
      ...entry,
      formatted: JSON.stringify({ ...metadata, prefix, namespace, level, type, message, stack })
    }
  }
}
