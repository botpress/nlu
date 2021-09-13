const { exec } = require('child_process')
const fse = require('fs-extra')
const path = require('path')

const metadata = {
  version: require(path.join(__dirname, '../packages/nlu-server/package.json')).version,
  date: Date.now(),
  branch: 'master'
}

try {
  exec('git rev-parse --abbrev-ref HEAD', (err, currentBranch) => {
    if (err) {
      return console.error(err)
    }

    metadata.branch = currentBranch.replace('\n', '')
    fse.writeJsonSync(path.resolve(__dirname, __dirname, '../packages/nlu-server/dist/metadata.json'), metadata)
  })
} catch (err) {
  console.error("Couldn't get active branch", err)
}
