import { InMemoryTransactionQueue } from './in-mem-trx-queue'
import { PGTransactionQueue } from './pg-trx-queue'
import * as sdk from './typings'

export const makeInMemoryTrxQueue: typeof sdk.makeInMemoryTrxQueue = (logger?: sdk.Logger) =>
  new InMemoryTransactionQueue(logger)
export const makePostgresTrxQueue: typeof sdk.makePostgresTrxQueue = (dbURL: string, logger?: sdk.Logger) =>
  new PGTransactionQueue(dbURL, logger)
