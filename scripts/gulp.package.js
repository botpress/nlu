const { spawn } = require('./utils/spawn')
const { version } = require('../package.json')
const path = require('path')
const chalk = require('chalk')

const targets = {
  win: 'node12-win32-x64',
  linux: 'node12-linux-x64',
  darwin: 'node12-macos-x64'
}

const projectRoot = path.join(__dirname, '..')
const projectDist = path.join(projectRoot, 'dist')

const makeFileName = (dist, version) => {
  return `nlu-v${version}-${dist}-x64`
}

const getAssetsPaths = async () => {
  const underscores = version.split('.').join('_')
  const dists = ['win', 'linux', 'darwin']
  return dists.map((d) => makeFileName(d, underscores)).map((fileName) => path.join(projectDist, fileName))
}

const package = async (cb) => {
  const underscores = version.split('.').join('_')
  try {
    for (const [dist, target] of Object.entries(targets)) {
      const fileName = makeFileName(dist, underscores)

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
          path.join(projectDist, filename)
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
  package,
  getAssetsPaths
}
