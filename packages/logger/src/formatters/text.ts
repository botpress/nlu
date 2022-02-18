import chalk from 'chalk'
import _ from 'lodash'
import moment from 'moment'
import os from 'os'
import util from 'util'
import { FormattedLogEntry, LogEntry, LogEntryFormatter, LoggerConfig } from '../typings'

function _serializeArgs(args: any): string {
  if (_.isArray(args)) {
    return args.map((arg) => _serializeArgs(arg)).join(', ')
  } else if (_.isObject(args)) {
    return util.inspect(args, false, 2, true)
  } else if (_.isString(args)) {
    return args.trim()
  } else if (args && args.toString) {
    return args.toString()
  } else {
    return ''
  }
}

export class TextFormatter implements LogEntryFormatter {
  constructor() {}

  public format(config: LoggerConfig, entry: LogEntry): FormattedLogEntry {
    const time = moment().format(config.timeFormat)
    const serializedMetadata = entry.metadata ? _serializeArgs(entry.metadata) : ''

    const prefix = config.prefix ? `[${config.prefix}] ` : ''
    let displayName = `${prefix}${entry.namespace}`
    displayName += entry.namespace.length ? ' ' : ''

    const newLineIndent = chalk.dim(' '.repeat(`${time} ${displayName}`.length))
    let indentedMessage =
      entry.level === 'error' ? entry.message : entry.message.replace(/\r\n|\n/g, os.EOL + newLineIndent)

    if (entry.type === 'stacktrace' && entry.stack) {
      indentedMessage += chalk.grey(os.EOL + 'STACK TRACE')
      indentedMessage += chalk.grey(os.EOL + entry.stack)
    }

    return {
      ...entry,
      formatted: chalk`{grey ${time}} {${
        config.colors[entry.level]
      }.bold ${displayName}}${indentedMessage}${serializedMetadata}`
    }
  }
}
