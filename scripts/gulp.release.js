const path = require('path')
const yargs = require('yargs')
const fse = require('fs-extra')
const semver = require('semver')
const prependFile = require('prepend-file')

const conventionalChangelog = require('conventional-changelog')
const { gitDescribe } = require('git-describe')
const ghRelease = require('gh-release')

const { spawn } = require('./utils/spawn')
const logger = require('./utils/logger')
const { getAssetsPaths } = require('./gulp.package')

const rootDir = path.join(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const changeLogPath = path.join(rootDir, 'CHANGELOG.md')

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

const getLatestGitTag = async () => {
  const { tag } = await gitDescribe(rootDir)
  return tag
}

const releaseOnGithub = (options) => {
  return new Promise((resolve, reject) => {
    ghRelease(options, (err, result) => {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })
}

/**
 * [x] - Create a git tag with desired version
 * [x] - Package new binaries
 * [x] - Create a new release on Github
 * [ ] - Push a Docker image
 */
const createNewRelease = async (cb) => {
  try {
    const currentVersion = await getCurrentversion()
    const latestGitTag = await getLatestGitTag()

    const validCurrentVersion = semver.valid(currentVersion)
    const validLatestGitTag = semver.valid(latestGitTag)

    logger.info(`Current version: ${currentVersion}`)
    logger.info(`Latest Git Tag: ${latestGitTag}`)

    if (!validCurrentVersion) {
      throw new Error(`Current version "${currentVersion}" is not a valid semver string.`)
    }
    if (!validLatestGitTag) {
      throw new Error(`Latest Git Tag "${latestGitTag}" is not a valid semver string.`)
    }

    const isReleaseNeeded = validCurrentVersion !== validLatestGitTag
    if (!isReleaseNeeded) {
      logger.info(`No release needed.`)
      cb()
      return
    }

    logger.info(`Release needed.`)

    const tagName = `v${validCurrentVersion}`
    // const message = `created tag ${tagName}`
    // await spawn('git', ['tag', '-a', `\"${tagName}\"`, '-m', `\"${message}\"`], { stdio: 'inherit' })

    await spawn('yarn', ['cmd', 'package'], { stdio: 'inherit' })

    const changeLog = await getChangeLog()

    var options = {
      tag_name: tagName,
      target_commitish: 'master',
      name: tagName,
      body: changeLog,
      draft: false,
      prerelease: false,
      repo: 'nlu',
      owner: 'botpress',
      endpoint: 'https://api.github.com',
      assets: getAssetsPaths()
    }

    options.auth = {
      token: process.env.GITHUB_TOKEN
    }

    await releaseOnGithub(options)

    cb()
  } catch (err) {
    cb(err)
  }
}

module.exports = {
  bumpVersion,
  createNewRelease
}
