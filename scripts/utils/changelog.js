const conventionalChangelog = require('conventional-changelog')

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

module.exports = {
  getChangeLog
}
