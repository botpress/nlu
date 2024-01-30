import { CRFTagger } from './base'
import { MultiThreadCRFTagger } from './multi-thread'

const isTsNode = !!process.env.TS_NODE_DEV // worker_threads do not work with ts-node

export * from './typings'

export type Tagger = CRFTagger
export const Tagger = isTsNode ? CRFTagger : MultiThreadCRFTagger
