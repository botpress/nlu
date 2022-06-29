import { Server } from 'http'
import * as types from '../typings'

export const serverListen = (httpServer: Server, options: types.NLUServerOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const hostname = options.host === 'localhost' ? undefined : options.host
      httpServer.listen(options.port, hostname, undefined, () => {
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}
