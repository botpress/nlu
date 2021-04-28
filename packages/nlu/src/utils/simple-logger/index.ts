import chalk from 'chalk'
import _ from 'lodash'
import moment from 'moment'
import os from 'os'
import util from 'util'
import { Logger as ILogger, LogLevel } from '../typings'
import { LoggerLevel } from './enums'

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

export const centerText = (text: string, width: number, indent: number = 0) => {
  const padding = Math.floor((width - text.length) / 2)
  return _.repeat(' ', padding + indent) + text + _.repeat(' ', padding)
}

/*
const logger = Logger.sub('nlu')
> 'global:nlu'

*/

export class Logger implements ILogger {
  public static default = new Logger()
  private static  _GLOBAL_NAMESPACE = 'global'
  private static _NAMESPACE_DELIMITER = ':'
  private _loggers = new Map<string, Logger>()
  public parent: Logger | null = null
  public namespace: string = ''
  public level: LoggerLevel = LoggerLevel.Info

  constructor(private _name: string = Logger._GLOBAL_NAMESPACE) {
  }

  public sub(name: string): Logger {
    if (this._loggers.has(this._name)) {
      return this._loggers.get(this._name)!
    }
    const logger = new Logger(name)

    if (name === Logger._GLOBAL_NAMESPACE) {
      logger.parent = null
      logger.namespace = ''
    } else {
      logger.parent = this
      logger.namespace = logger.parent.namespace.length ? logger.parent.namespace + Logger._NAMESPACE_DELIMITER : ''
      logger.namespace +=  name
    }

    this._loggers.set(name, logger)
    return logger
  }

  critical(message: string, metadata?: any): void {
    this.print(LoggerLevel.Critical, message, metadata)
  }

  setLevel(level: LoggerLevel): this {
    this.level = level
    return this
  }

  showError(error: Error): this {
    this.print(LoggerLevel.Critical, error.message, error)
    return this
  }

  colors = {
    [LoggerLevel.Info]: 'green',
    [LoggerLevel.Warn]: 'yellow',
    [LoggerLevel.Error]: 'red',
    [LoggerLevel.Debug]: 'blue'
  }

  private print(level: LoggerLevel, message: string, metadata: any) {
    const serializedMetadata = metadata ? _serializeArgs(metadata) : ''
    const timeFormat = 'L HH:mm:ss.SSS'
    const time = moment().format(timeFormat)

    const displayName = process.env.INDENT_LOGS ? this.namespace.substr(0, 15).padEnd(15, ' ') : this.namespace
    // eslint-disable-next-line prefer-template
    const newLineIndent = chalk.dim(' '.repeat(`${timeFormat} ${displayName}`.length)) + ' '
    const indentedMessage = level === LoggerLevel.Error ? message : message.replace(/\r\n|\n/g, os.EOL + newLineIndent)
        // eslint-disable-next-line no-console
        console.log(
          chalk`{grey ${time}} {${this.colors[level]}.bold ${displayName}} ${indentedMessage}${serializedMetadata}`
        )
  }

  debug(message: string, metadata?: any): void {
    this.print(LoggerLevel.Debug, message, metadata)
  }

  info(message: string, metadata?: any): void {
    this.print(LoggerLevel.Info, message, metadata)
  }

  warn(message: string, metadata?: any): void {
    this.print(LoggerLevel.Warn, message, metadata)
  }

  error(message: string, metadata?: any): void {
    this.print(LoggerLevel.Error, message, metadata)
  }
}

const globalLogger = new Logger()

export default globalLogger
