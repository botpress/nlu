import Knex from 'knex'
import { KnexExtended } from '../../typings'

export abstract class Table {
  constructor(public knex: KnexExtended) {}
  abstract bootstrap(): Promise<boolean>
  abstract get name(): string
}

class GhostFilesTable extends Table {
  readonly name: string = 'srv_ghost_files'

  async bootstrap() {
    let created = false
    await this.knex.createTableIfNotExists(this.name, (table) => {
      table.string('file_path').primary()
      table.binary('content')
      table.boolean('deleted')
      table.timestamp('modified_on')
      created = true
    })
    return created
  }
}

class GhostRevisionsTable extends Table {
  readonly name: string = 'srv_ghost_index'

  async bootstrap() {
    let created = false
    await this.knex.createTableIfNotExists(this.name, (table) => {
      table.string('file_path')
      table.string('revision')
      table.string('created_by')
      table.timestamp('created_on')
      table.primary(['file_path', 'revision'])
      created = true
    })

    return created
  }
}

const tables: typeof Table[] = [GhostFilesTable, GhostRevisionsTable]

export default <(new (knex: Knex) => Table)[]>tables
