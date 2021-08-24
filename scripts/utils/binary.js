const os = require('os')
const semverParse = require('semver/functions/parse')
const { version } = require('../../package.json')

const getCurrentDistribution = () => {
  const rawPlatform = os.platform() // : 'darwin' | 'linux' | 'win32'
  return rawPlatform.replace('win32', 'win')
}

const semverToUnderscores = (semverStr) => {
  const { major, minor, patch, prerelease } = semverParse(semverStr)
  const underscores = [major, minor, patch, ...prerelease].join('_')
  return underscores
}

const makeFileName = (underscoreVersion, distribution) => {
  return `nlu-v${underscoreVersion}-${distribution}-x64`
}

const getFileName = () => {
  const underscores = semverToUnderscores(version)
  const dist = getCurrentDistribution()
  const filename = makeFileName(underscores, dist)
  return filename
}

module.exports = {
  getFileName,
  makeFileName,
  semverToUnderscores
}
