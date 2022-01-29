import _ from 'lodash'
import { FormattedLogEntry, LoggerConfig, LogTransporter } from '../typings'

export const conforms = (namespace: string, rule: string, delimiter: string) => {
  if (!rule) {
    return true
  }
  const splittedRule = rule.split(delimiter)
  const namespaces = namespace.split(delimiter)

  const truthTable = _.zip(splittedRule, namespaces).map(([r, ns]) => (r === undefined ? true : r === ns))
  return !truthTable.includes(false)
}

export class ConsoleTransport implements LogTransporter {
  public send(_config: LoggerConfig, entry: FormattedLogEntry) {
    // eslint-disable-next-line no-console
    console.log(entry.formatted)
  }
}
