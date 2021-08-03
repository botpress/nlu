import chokidar from 'chokidar'
import path from 'path'
import { getProjectLocation } from '../project-location'

export const buildWatcher = () => {
  const projectLocation = getProjectLocation()

  const foldersToWatch = [path.join(projectLocation, 'data', 'bots'), path.join(projectLocation, 'data', 'global')]

  return chokidar.watch(foldersToWatch, {
    ignoreInitial: true,
    ignorePermissionErrors: true
  })
}
