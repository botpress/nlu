import bytes from 'bytes'
import chokidar from 'chokidar'
import { EventEmitter } from 'events'
import LRU from 'lru-cache'
import path from 'path'
import { getProjectLocation } from '../../project-location'
import { forceForwardSlashes } from './misc'

export interface ObjectCache {
  readonly events: EventEmitter
  get<T>(key: string): Promise<T>
  set<T>(key: string, obj: T): Promise<void>
  has(key: string): Promise<boolean>
  invalidate(key: string): Promise<void>
  invalidateStartingWith(prefix: string): Promise<void>
  sync(message: string): Promise<void>
}

class FileChangedInvalidator {
  constructor(private watcher: chokidar.FSWatcher) {}

  cache?: ObjectCache

  install(objectCache: ObjectCache) {
    this.cache = objectCache

    this.watcher.on('add', this.handle)
    this.watcher.on('change', this.handle)
    this.watcher.on('unlink', this.handle)
    // watcher.on('error', err => this.logger.attachError(err).error('Watcher error'))
  }

  handle = async (file: string) => {
    if (!this.cache) {
      return
    }

    const projectLocation = getProjectLocation()
    const relativePath = forceForwardSlashes(path.relative(projectLocation, path.dirname(file)))
    this.cache.events.emit('invalidation', relativePath)
    await this.cache.invalidateStartingWith(relativePath)
  }
}

export class MemoryObjectCache implements ObjectCache {
  private cache: LRU<string, any>
  private cacheInvalidator: FileChangedInvalidator

  public readonly events: EventEmitter = new EventEmitter()

  constructor(watcher: chokidar.FSWatcher) {
    this.cacheInvalidator = new FileChangedInvalidator(watcher)
    this.cache = new LRU({
      max: bytes(process.env.BP_MAX_MEMORY_CACHE_SIZE || '1gb'),
      length: (obj) => {
        if (Buffer.isBuffer(obj)) {
          return obj.length
        } else if (typeof obj === 'string') {
          return obj.length * 2 // chars are 2 bytes in ECMAScript
        }

        return 1024 // Assuming 1kb per object, this is kind of random
      }
    })

    this.cacheInvalidator.install(this)
  }

  async get<T>(key: string): Promise<T> {
    return <T>this.cache.get(key)
  }

  async set<T>(key: string, obj: T): Promise<void> {
    this.cache.set(key, obj)
    this.events.emit('invalidation', key)
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key)
  }

  async invalidate(key: string): Promise<void> {
    this.cache.del(key)
    this.events.emit('invalidation', key)
  }

  async invalidateStartingWith(prefix: string): Promise<void> {
    const keys = this.cache.keys().filter((x) => {
      return x.startsWith('buffer::' + prefix) || x.startsWith('string::' + prefix) || x.startsWith('object::' + prefix)
    })

    keys.forEach((x) => this.cache.del(x))
    this.events.emit('invalidation', prefix)
  }

  async sync(message: string): Promise<void> {
    this.events.emit('syncDbFilesToDisk', message)
  }
}
