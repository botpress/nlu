import { SVMClassifier } from './base'
import { MultiThreadSVMClassifier } from './multi-thread'

const isTsNode = !!process.env.TS_NODE_DEV // worker_threads do not work with ts-node

export * from './typings'

export type Classifier = SVMClassifier
export const Classifier = isTsNode ? SVMClassifier : MultiThreadSVMClassifier
