global['NativePromise'] = global.Promise

import path from 'path'
import { getAppDataPath } from './app-data'
import getos from './utils/getos'

process.core_env = process.env as BotpressEnvironmentVariables

if (process.env.APP_DATA_PATH) {
  process.APP_DATA_PATH = process.env.APP_DATA_PATH
} else {
  process.APP_DATA_PATH = getAppDataPath()
}

process.LOADED_MODULES = {}
process.PROJECT_LOCATION = process.pkg
  ? path.dirname(process.execPath) // We point at the binary path
  : __dirname // e.g. /dist/..

void getos().then(distro => {
  process.distro = distro
  require('./bootstrap')
})
