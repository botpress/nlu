import path from 'path'
import chokidar from 'chokidar'

export const buildWatcher = () => {
  const foldersToWatch = [
    path.join(process.PROJECT_LOCATION, 'data', 'bots'),
    path.join(process.PROJECT_LOCATION, 'data', 'global')
  ]

  return chokidar.watch(foldersToWatch, {
    ignoreInitial: true,
    ignorePermissionErrors: true
  })
}
