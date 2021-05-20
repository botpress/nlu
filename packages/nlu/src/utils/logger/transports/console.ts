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
  send(config: LoggerConfig, entry: FormattedLogEntry) {
    if (entry.level <= config.level) {
      if (!config.filters.length) {
        this._log(entry.formatted)
      }

      for (const rule of config.filters) {
        if (conforms(entry.namespace, rule, config.namespaceDelimiter)) {
          this._log(entry.formatted)
          break
        }
      }
    }
  }

  private _log(msg: string) {
    // eslint-disable-next-line no-console
    console.log(msg)
  }
}
