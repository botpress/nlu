import { Logger } from '@botpress/logger'
import Bluebird from 'bluebird'
import { mkdirpSync } from 'fs-extra'
import Knex from 'knex'
import _ from 'lodash'
import path from 'path'
import { getProjectLocation } from '../../../project-location'
import { patchKnex } from './helpers'

import AllTables, { Table } from './tables'
import { KnexExtended } from './typings'

export type DatabaseType = 'postgres' | 'sqlite'

export class Database {
  knex!: KnexExtended

  private tables: Table[] = []

  public constructor(private logger: Logger, private dbURL?: string) {}

  async bootstrap() {
    await Bluebird.mapSeries(AllTables, async (Tbl) => {
      const table = new Tbl(this.knex!)
      const created = await table.bootstrap()
      if (created) {
        this.logger.debug(`Created table '${table.name}'`)
      }
      this.tables.push(table)
    })
  }

  async seedForTests() {
    // Add seeding here
  }

  async teardownTables() {
    await Bluebird.mapSeries(AllTables, async (Tbl) => {
      const table = new Tbl(this.knex!)
      if (this.knex.isLite) {
        await this.knex.raw('PRAGMA foreign_keys = OFF;')
        await this.knex.raw(`DROP TABLE IF EXISTS "${table.name}";`)
        await this.knex.raw('PRAGMA foreign_keys = ON;')
      } else {
        await this.knex.raw(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`)
      }
    })
  }

  async initialize(databaseType: DatabaseType = 'postgres') {
    const logger = this.logger
    const { DATABASE_URL, DATABASE_POOL } = process.env

    let poolOptions: Knex.PoolConfig = {}

    try {
      const customPoolOptions = DATABASE_POOL ? JSON.parse(DATABASE_POOL) : {}
      poolOptions = { ...poolOptions, ...customPoolOptions }
    } catch (err) {
      this.logger.warn('Database pool option is not valid json')
    }

    if (DATABASE_URL) {
      if (!databaseType) {
        databaseType = DATABASE_URL.toLowerCase().startsWith('postgres') ? 'postgres' : 'sqlite'
      }
      if (!this.dbURL) {
        this.dbURL = DATABASE_URL
      }
    }

    let config: Knex.Config = {
      useNullAsDefault: true,
      log: {
        error: (message) => logger.error(`[knex] ${message}`),
        warn: (message) => logger.warn(`[knex] ${message}`),
        debug: (message) => logger.debug(`[knex] ${message}`)
      }
    }

    if (databaseType === 'postgres') {
      config = { ...config, client: 'pg', connection: this.dbURL, pool: poolOptions }
    } else {
      const projectLocation = getProjectLocation()
      const dbLocation = this.dbURL ? this.dbURL : `${projectLocation}/data/storage/core.sqlite`
      mkdirpSync(path.dirname(dbLocation))

      Object.assign(config, {
        client: 'sqlite3',
        connection: { filename: dbLocation },
        pool: {
          afterCreate: (conn, cb) => {
            conn.run('PRAGMA foreign_keys = ON', cb)
          },
          ...poolOptions
        }
      })
    }

    this.knex = patchKnex(Knex(config))

    await this.bootstrap()
  }
}
