const child_process = require('child_process')

const wrapWithPromise = (spawnCmd) => {
  return new Promise(async (resolve, reject) => {
    try {
      const spawnedPocess = spawnCmd()
      spawnedPocess.on('exit', (code, signal) => {
        if (code !== 0) {
          console.error(`Process exited with exit-code ${code} and signal ${signal}`)
          reject()
        }
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}

const spawn = (program, args, params) => {
  return wrapWithPromise(() => child_process.spawn(program, args, params))
}

module.exports = {
  spawn
}
