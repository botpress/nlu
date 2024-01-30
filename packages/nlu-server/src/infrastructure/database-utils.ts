import { Knex } from 'knex'

export const createTableIfNotExists = async (
  knex: Knex,
  tableName: string,
  cb: (tableBuilder: Knex.CreateTableBuilder) => void
): Promise<boolean> => {
  return knex.schema.hasTable(tableName).then((exists) => {
    if (exists) {
      return false
    }
    return knex.schema.createTable(tableName, cb).then(() => true)
  })
}
