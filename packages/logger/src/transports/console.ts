import _ from 'lodash'
import { FormattedLogEntry, LoggerConfig, LogTransporter } from '../typings'

export class ConsoleTransport implements LogTransporter {
  public send(_config: LoggerConfig, entry: FormattedLogEntry) {
    // eslint-disable-next-line no-console
    console.log(entry.formatted)
  }
}
