const { exec } = require('child_process')
const fse = require('fs-extra')
const yargs = require('yargs')

const getCurrentGitBranch = () => {
  return new Promise((resolve, reject) => {
    exec('git rev-parse --abbrev-ref HEAD', (err, currentBranch) => {
      if (err) {
        return reject(err)
      }
      return resolve(currentBranch.replace('\n', ''))
    })
  })
}

yargs
  .command(['$0 <filePath>'], 'Create Build Info File', {}, async (argv) => {
    try {
      const branch = await getCurrentGitBranch()
      const metadata = { date: Date.now(), branch }
      await fse.writeJSON(argv.filePath, metadata)
    } catch (err) {
      console.error("Couldn't get active branch", err)
    }
  })
  .help().argv
