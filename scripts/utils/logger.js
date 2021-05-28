const chalk = require('chalk')

const logger = {
  info: (msg) => {
    const prefix = chalk.green('[INFO]')
    console.log(`${prefix} ${msg}`)
  },
  warning: (msg) => {
    const prefix = chalk.yellow('[WARNING]')
    console.log(`${prefix} ${msg}`)
  },
  error: (msg) => {
    const prefix = chalk.red('[ERROR]')
    console.log(`${prefix} ${msg}`)
  }
}
module.exports = logger
