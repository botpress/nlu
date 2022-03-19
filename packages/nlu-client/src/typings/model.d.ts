import { Readable } from 'stream'

type Override<T, K> = Omit<T, keyof K> & K
export type ModelStream = Readable & { length: number }
export type BufferOpts = { responseType: 'arraybuffer' }
export type StreamOpts = { responseType: 'stream' }
export type DownloadOpts = BufferOpts | StreamOpts
