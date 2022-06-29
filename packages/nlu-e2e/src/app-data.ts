import path from 'path'

export function getAppDataPath() {
  const homeDir = process.env.APP_DATA_PATH || process.env.HOME || process.env.APPDATA
  if (homeDir) {
    if (process.platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'botpress')
    }

    return path.join(homeDir, 'botpress')
  }

  const errorMsg = `Could not determine your HOME directory.
Please set the environment variable "APP_DATA_PATH", then start Botpress`
  throw new Error(errorMsg)
}
