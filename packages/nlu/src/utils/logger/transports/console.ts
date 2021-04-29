import { FormattedLogEntry, LoggerConfig, LogTransporter } from '../typings'

export class ConsoleTransport implements LogTransporter {
  send(config: LoggerConfig, entry: FormattedLogEntry) {
    if (entry.level <= config.level) {
      // eslint-disable-next-line no-console
      console.log(entry.formatted)
    }
  }
}
