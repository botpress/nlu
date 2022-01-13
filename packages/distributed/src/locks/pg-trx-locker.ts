import crypto from 'crypto'
import _ from 'lodash'
import { Client } from 'pg'
import { InMemoryTransactionLocker } from './in-mem-trx-locker'
import { TransactionLocker, Transaction, Logger } from './typings'

const TRX_LOCK_KEY = 'trx_lock'

/**
 * For race conditions occuring in distributed applications
 */
export class PGTransactionLocker<T> implements TransactionLocker<T> {
  private client: Client
  private _memQueue = new InMemoryTransactionLocker<T>()

  constructor(dbURL: string, private _logger?: Logger) {
    this.client = new Client(dbURL)
  }

  public initialize() {
    return this.client.connect()
  }

  public teardown() {
    return this.client.end()
  }

  public async runInLock(t: Transaction<T>): Promise<T> {
    this._logger?.(`Trx "${t.name}" waiting.`)

    return this._memQueue.runInLock({
      name: t.name,
      cb: async () => {
        let x: T

        try {
          await this._waitForLock(TRX_LOCK_KEY)
          this._logger?.(`Trx "${t.name}" started.`)
          x = await t.cb()
          this._logger?.(`Trx "${t.name}" done.`)
        } finally {
          await this._releaseLock(TRX_LOCK_KEY)
        }

        return x
      }
    })
  }

  private async _waitForLock(key: string): Promise<void> {
    const [classid, objid] = this._strToKey(key)
    await this.client.query(
      `
        SELECT pg_advisory_lock($1, $2)
    `,
      [classid, objid]
    )
  }

  private async _releaseLock(key: string): Promise<boolean> {
    const [classid, objid] = this._strToKey(key)
    const res = await this.client.query(
      `
            SELECT pg_advisory_unlock($1, $2);
        `,
      [classid, objid]
    )
    return res.rows[0].pg_advisory_unlock
  }

  private _strToKey(str: string) {
    const buf = crypto.createHash('sha256').update(str).digest()
    return [buf.readInt32LE(0), buf.readInt32LE(4)]
  }
}
