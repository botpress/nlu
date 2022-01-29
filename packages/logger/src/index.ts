import _ from 'lodash'

export const centerText = (text: string, width: number, indent: number = 0) => {
  const padding = Math.floor((width - text.length) / 2)
  return _.repeat(' ', padding + indent) + text + _.repeat(' ', padding)
}

export * from './typings'
export { LoggerLevel } from './config'
export { Logger } from './logger'
export { JSONFormatter, TextFormatter } from './formatters'
export { ConsoleTransport } from './transports/console'
