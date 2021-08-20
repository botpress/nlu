import { Logger } from '@botpress/logger'
import chokidar from 'chokidar'
import { Database, DBStorageDriver, DiskStorageDriver, GhostService, MemoryObjectCache } from './ghost'

export const makeGhost = (logger: Logger, modelDir: string, watcher: chokidar.FSWatcher, dbURL?: string) => {
  const _db = new Database(logger, dbURL)
  const diskDriver = new DiskStorageDriver({ basePath: modelDir })
  const dbdriver = new DBStorageDriver(_db)
  const cache = new MemoryObjectCache(watcher)
  const ghost = new GhostService(diskDriver, dbdriver, cache, logger)
  return ghost
}
