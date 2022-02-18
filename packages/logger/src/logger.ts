import _ from 'lodash'
import regexParser from 'regex-parser'
import { LogLevel } from '.'
import { defaultConfig } from './config'
import * as types from './typings'

let idx = 0
const LogLevelValue: Record<LogLevel, number> = {
  critical: idx++,
  error: idx++,
  warning: idx++,
  info: idx++,
  debug: idx++
}

export class Logger implements types.Logger {
  private _loggers = new Map<string, Logger>()
  private _config: types.LoggerConfig = defaultConfig
  private _currentError: Error | undefined
  private _filters: { [level: number]: RegExp } = {}

  public parent: Logger | null = null
  public namespace: string = ''

  constructor(name: string = '', config?: Partial<types.LoggerConfig>) {
    this.namespace = name
    config && this.configure(config)
  }

  public configure(config: Partial<types.LoggerConfig>) {
    this._config = { ...this._config, ...config }
    if (config.filters) {
      this._filters = _.mapValues(config.filters, regexParser)
    }

    // logger configures all childs
    for (const logger of this._loggers.values()) {
      logger.configure(config)
    }
  }

  public sub(name: string): Logger {
    if (this._loggers.has(name)) {
      return this._loggers.get(name)!
    }
    const logger = new Logger('', { ...this._config })
    logger.parent = this

    logger.namespace = logger.parent.namespace.length ? logger.parent.namespace + this._config.namespaceDelimiter : ''
    logger.namespace += name

    this._loggers.set(name, logger)
    return logger
  }

  public attachError(error: Error): this {
    this._currentError = error
    return this
  }

  public critical(message: string, metadata?: any): void {
    this.log({ type: 'log', level: 'critical', message, metadata })
  }

  public debug(message: string, metadata?: any): void {
    this.log({ type: 'log', level: 'debug', message, metadata })
  }

  public info(message: string, metadata?: any): void {
    this.log({ type: 'log', level: 'info', message, metadata })
  }

  public warn(message: string, metadata?: any): void {
    this.log({ type: 'log', level: 'warning', message, metadata })
  }

  public error(message: string, metadata?: any): void {
    this.log({ type: 'log', level: 'error', message, metadata })
  }

  public log(entry: Omit<types.LogEntry, 'namespace'>) {
    if (LogLevelValue[this._config.level] < LogLevelValue[entry.level]) {
      return
    }

    const regex = this._filters[entry.level]
    if (!regex) {
      return this._log(entry)
    }

    const match = regex.test(this.namespace)
    regex.lastIndex = 0
    if (!match) {
      return
    }
    this._log(entry)
  }

  private _log = (entry: Omit<types.LogEntry, 'namespace'>) => {
    this._send(entry)
    if (this._currentError) {
      const { message, stack } = this._currentError
      this._send({ type: 'stacktrace', level: entry.level, message, stack })
      this._currentError = undefined
    }
  }

  private _send(entry: Omit<types.LogEntry, 'namespace'>) {
    const formattedEntry = this._config.formatter.format(this._config, { ...entry, namespace: this.namespace })
    this._config.transports.forEach((transport) => transport.send(this._config, formattedEntry))
  }
}
