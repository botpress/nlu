const child_process = require('child_process')
const logger = require('./logger')

const spawn = (program, args, params) => {
  const cmd = [program, ...args].join(' ')
  logger.info(`Launching '${cmd}'`)
  return new Promise(async (resolve, reject) => {
    try {
      const spawnedPocess = child_process.spawn(program, args, params)
      spawnedPocess.on('exit', (code, signal) => {
        if (code !== 0) {
          const error = new Error(`Process exited with exit-code ${code} and signal ${signal}`)
          reject(error)
        }
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  spawn
}
