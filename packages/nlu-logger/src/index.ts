import _ from 'lodash'
import { defaultConfig, LoggerLevel } from './config'
import * as sdk from './typings'

export const centerText: typeof sdk.centerText = (text: string, width: number, indent: number = 0) => {
  const padding = Math.floor((width - text.length) / 2)
  return _.repeat(' ', padding + indent) + text + _.repeat(' ', padding)
}

export { LoggerLevel } from './config'

class _Logger implements sdk.ILogger {
  public static default = new _Logger()
  private static _GLOBAL_NAMESPACE = 'global'
  private _loggers = new Map<string, _Logger>()
  private _config: sdk.LoggerConfig = defaultConfig
  public parent: _Logger | null = null
  public namespace: string = ''

  constructor(private _name: string = _Logger._GLOBAL_NAMESPACE) {}

  configure(config: Partial<sdk.LoggerConfig>) {
    this._config = { ...this._config, ...config }

    // logger configures all childs
    for (const logger of this._loggers.values()) {
      logger.configure(config)
    }
  }

  public sub(name: string): _Logger {
    if (this._loggers.has(name)) {
      return this._loggers.get(name)!
    }
    const logger = new _Logger(name)

    if (name === _Logger._GLOBAL_NAMESPACE) {
      logger.parent = null
      logger.namespace = ''
    } else {
      logger.parent = this
      logger._config = { ...this._config } // copy parent config
      logger.namespace = logger.parent.namespace.length ? logger.parent.namespace + this._config.namespaceDelimiter : ''
      logger.namespace += name
    }

    this._loggers.set(name, logger)
    return logger
  }

  attachError(error: Error): this {
    this.push({ type: 'stacktrace', level: LoggerLevel.Critical, message: error.message, stack: error.stack })
    return this
  }

  private push(entry: Omit<sdk.LogEntry, 'namespace'>) {
    const formattedEntry = this._config.formatter.format(this._config, { ...entry, namespace: this.namespace })
    this._config.transports.forEach((transport) => transport.send(this._config, formattedEntry))
  }

  critical(message: string, metadata?: any): void {
    this.push({ type: 'log', level: LoggerLevel.Critical, message, metadata })
  }

  debug(message: string, metadata?: any): void {
    this.push({ type: 'log', level: LoggerLevel.Debug, message, metadata })
  }

  info(message: string, metadata?: any): void {
    this.push({ type: 'log', level: LoggerLevel.Info, message, metadata })
  }

  warn(message: string, metadata?: any): void {
    this.push({ type: 'log', level: LoggerLevel.Warn, message, metadata })
  }

  error(message: string, metadata?: any): void {
    this.push({ type: 'log', level: LoggerLevel.Error, message, metadata })
  }
}
export const Logger = new _Logger()
