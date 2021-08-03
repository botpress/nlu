import chokidar from 'chokidar'
import path from 'path'

export const getProjectLocation = () => {
  return process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
}

export const buildWatcher = () => {
  const projectLocation = getProjectLocation()

  const foldersToWatch = [path.join(projectLocation, 'data', 'bots'), path.join(projectLocation, 'data', 'global')]

  return chokidar.watch(foldersToWatch, {
    ignoreInitial: true,
    ignorePermissionErrors: true
  })
}
