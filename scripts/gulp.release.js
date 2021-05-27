const conventionalChangelog = require('conventional-changelog')
const path = require('path')
const yargs = require('yargs')
const fse = require('fs-extra')
const semver = require('semver')

const { spawn } = require('./utils/spawn')
const logger = require('./utils/logger')

const packageJsonPath = path.join(__dirname, '..', 'package.json')
const changeLogPath = path.join(__dirname, '..', 'CHANGELOG.md')

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

const getChangeLog = () => {
  return new Promise((resolve, reject) => {
    let msg = ''

    const changelogOts = {
      preset: 'angular',
      releaseCount: 1
    }
    const context = {}
    const gitRawCommitsOpts = {
      merges: null
    }
    const commitsParserOpts = {
      mergePattern: /^Merge pull request #(\d+) from (.*)/gi,
      mergeCorrespondence: ['id', 'source']
    }
    const changelogWriterOpts = {}

    conventionalChangelog(changelogOts, context, gitRawCommitsOpts, commitsParserOpts, changelogWriterOpts)
      .on('data', (chunk) => {
        msg += chunk.toString()
      })
      .on('end', () => resolve(msg))
      .on('error', (err) => reject(err))
  })
}

/**
 * 1 - Updates project version to desired version (in package.json)
 * 2 - Updates CHANGELOG.md with conventional changelog
 */
const bumpVersion = (cb) => {
  yargs
    .command(
      ['release', '$0'],
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
          const { jump } = argv

          const packageJson = await fse.readJSON(packageJsonPath)
          const currentVersion = packageJson.version
          const newVersion = getNextVersion(currentVersion, jump)

          await spawn('yarn', ['version', '--new-version', newVersion, '--no-git-tag-version'], { stdio: 'inherit' })

          const changeLog = await getChangeLog()
          if (changeLog) {
            logger.info('Change Log:')
            logger.info(`\n${changeLog}`)
          } else {
            logger.warning('There seems to be no changelog. Make sure this is desired.')
          }

          await fse.appendFile(changeLogPath, changeLog)
          cb()
        } catch (err) {
          cb(err)
        }
      }
    )
    .help().argv
}

/**
 * [ ] - Create a git tag with desired version
 * [ ] - Create a release commit
 * [ ] - Package new binaries
 * [ ] - Create a new release on Github
 * [ ] - Push a Docker image
 */
const createNewRelease = (cb) => {
  logger.info('Create new releases!')
  cb()
}

module.exports = {
  bumpVersion,
  createNewRelease
}
