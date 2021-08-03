import Knex from 'knex'
export interface KnexExtension {
  isLite: boolean
  location: string
  createTableIfNotExists(tableName: string, cb: Knex.KnexCallback): Promise<boolean>
  date: Knex.Date
  bool: Knex.Bool
  json: Knex.Json
  binary: Knex.Binary
  insertAndRetrieve<T>(
    tableName: string,
    data: {},
    returnColumns?: string | string[],
    idColumnName?: string,
    trx?: Knex.Transaction
  ): Promise<T>
}

export type KnexExtended = Knex & KnexExtension
