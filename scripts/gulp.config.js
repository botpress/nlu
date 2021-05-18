const fs = require('fs')
const path = require('path')

const rootPath = path.join(__dirname, '..')
const filePath = path.join(rootPath, 'config.json')

function createEmptyConfigFile() {
  const rawContent = '{}'
  fs.writeFileSync(filePath, rawContent)
}

function upsertConfigFile(cb) {
  try {
    const exists = fs.existsSync(filePath)
    if (!exists) {
      createEmptyConfigFile()
    }
    cb()
  } catch (err) {
    cb(err)
  }
}

module.exports = {
  upsertConfigFile
}
