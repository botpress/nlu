const { spawn } = require('child_process')
const { version } = require('../package.json')
const path = require('path')
const chalk = require('chalk')

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

const targets = {
  win: 'node12-win32-x64',
  linux: 'node12-linux-x64',
  darwin: 'node12-macos-x64'
}

const projectRoot = path.join(__dirname, '..')

const package = async (cb) => {
  const underscores = version.split('.').join('_')
  try {
    for (const [dist, target] of Object.entries(targets)) {
      const fileName = `nlu-v${underscores}-${dist}-x64`

      console.log(chalk.green(`Packaging ${fileName}`))

      await wrapWithPromise(() =>
        spawn(
          'pkg',
          [
            `${projectRoot}/package.json`,
            '--options',
            'max_old_space_size=16384',
            '--targets',
            target,
            '--output',
            `${projectRoot}/dist/${fileName}`
          ],
          { cwd: projectRoot, stdio: 'inherit', shell: true }
        )
      )
    }
    cb()
  } catch (err) {
    cb(err)
  }
}

module.exports = {
  package
}
