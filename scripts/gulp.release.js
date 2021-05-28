const path = require('path')
const yargs = require('yargs')
const fse = require('fs-extra')
const semver = require('semver')
const prependFile = require('prepend-file')

const { spawn } = require('./utils/spawn')
const logger = require('./utils/logger')
const { getChangeLog } = require('./utils/changelog')

const rootDir = path.join(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const changeLogPath = path.join(rootDir, 'CHANGELOG.md')

const pullTags = () => {
  return spawn('git', ['fetch', '--tags'], { stdio: 'inherit' })
}

const getCurrentversion = async () => {
  const packageJson = await fse.readJSON(packageJsonPath)
  return packageJson.version
}

const getNextVersion = (currentVersion, jump) => {
  const validCurrentVersion = semver.valid(currentVersion)
  if (!validCurrentVersion) {
    throw new Error(`Current version "${v}" is not a valid semver string.`)
  }

  const newVersion = validCurrentVersion.split('.').map((x) => Number(x))
  if (jump === 'major') {
    newVersion[0] += 1
    newVersion[1] = 0
    newVersion[2] = 0
  } else if (jump === 'minor') {
    newVersion[1] += 1
    newVersion[2] = 0
  } else {
    newVersion[2] += 1
  }

  return newVersion.join('.')
}

/**
 * 1 - Updates project version to desired version (in package.json)
 * 2 - Updates CHANGELOG.md with conventional changelog
 */
const bumpVersion = (cb) => {
  yargs
    .command(
      ['$0'],
      'Create New Release',
      {
        jump: {
          alias: 'j',
          description: 'Weither to jump by a major, a minor or a patch',
          choices: ['major', 'minor', 'patch'],
          type: 'string',
          demandOption: true
        }
      },
      async (argv) => {
        try {
          await pullTags()

          const { jump } = argv

          const currentVersion = await getCurrentversion()
          const newVersion = getNextVersion(currentVersion, jump)

          await spawn('yarn', ['version', '--new-version', newVersion, '--no-git-tag-version'], { stdio: 'inherit' })

          const changeLog = await getChangeLog()
          if (changeLog) {
            logger.info('Change Log:')
            logger.info(`\n${changeLog}`)
          } else {
            logger.warning('There seems to be no changelog. Make sure this is desired.')
          }

          await prependFile(changeLogPath, changeLog)
          cb()
        } catch (err) {
          cb(err)
        }
      }
    )
    .help().argv
}

const printChangeLog = async (cb) => {
  try {
    await pullTags()
    const changeLog = await getChangeLog()
    if (changeLog) {
      logger.info('Change Log:')
      logger.info(`\n${changeLog}`)
    } else {
      logger.warning('There seems to be no changelog. Make sure this is desired.')
    }
    cb()
  } catch (err) {
    cb(err)
  }
}

module.exports = {
  bumpVersion,
  printChangeLog
}
