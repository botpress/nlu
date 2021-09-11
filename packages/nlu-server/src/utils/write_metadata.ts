import { exec } from 'child_process'
import fse from 'fs-extra'
import path from 'path'

const metadata = {
  version: require(path.join(__dirname, '../../package.json')).version,
  date: Date.now(),
  branch: 'master'
}

try {
  exec('git rev-parse --abbrev-ref HEAD', (err, currentBranch) => {
    metadata.branch = currentBranch.replace('\n', '')
    fse.writeJsonSync(path.resolve(__dirname, '../metadata.json'), metadata)
  })
} catch (err) {
  console.error("Couldn't get active branch", err)
}
