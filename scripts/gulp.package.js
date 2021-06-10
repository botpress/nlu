const { spawn } = require('./utils/spawn')
const { version } = require('../package.json')
const path = require('path')
const chalk = require('chalk')
const _ = require('lodash')

const targets = {
  win: 'node12-win32-x64',
  linux: 'node12-linux-x64',
  darwin: 'node12-macos-x64'
}

const projectRoot = path.join(__dirname, '..')
const projectDist = path.join(projectRoot, 'dist')

const computeDistributions = () => {
  const packageWindows = process.argv.includes('--win')
  const packageDarwin = process.argv.includes('--darwin')
  const packageLinux = process.argv.includes('--linux')
  const packageAll = !(packageWindows || packageDarwin || packageLinux)

  if (packageAll) {
    return targets
  }
  return _.pickBy(targets, (v, k) => {
    return (k === 'win' && packageWindows) || (k === 'darwin' && packageDarwin) || (k === 'linux' && packageLinux)
  })
}

const package = async (cb) => {
  const underscores = version.split('.').join('_')
  try {
    const distributions = computeDistributions()

    for (const [dist, target] of Object.entries(distributions)) {
      const fileName = `nlu-v${underscores}-${dist}-x64`

      console.log(chalk.green(`Packaging ${fileName}`))

      await spawn(
        'pkg',
        [
          path.join(projectRoot, 'package.json'),
          '--options',
          'max_old_space_size=16384',
          '--targets',
          target,
          '--output',
          path.join(projectDist, fileName)
        ],
        { cwd: projectRoot, stdio: 'inherit', shell: true }
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
