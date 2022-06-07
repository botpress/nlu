import _ from 'lodash'
import kmeans from 'ml-kmeans'

import { Tagger, Trainer as CRFTrainer } from './crf'
import { MultiThreadTrainer as CRFMultiThreadTrainer } from './crf/multi-thread-trainer'
import { FastTextModel } from './fasttext'
import { processor } from './sentencepiece'
import { Predictor, Trainer as SVMTrainer } from './svm'
import { MultiThreadTrainer as SVMMultiThreadTrainer } from './svm/multi-thread-trainer'
import { MLToolkit as IMLToolkit } from './typings'

const isTsNode = !!process.env.TS_NODE_DEV // worker_threads do not work with ts-node

const MLToolkit: typeof IMLToolkit = {
  KMeans: {
    kmeans
  },
  CRF: {
    Tagger,
    Trainer: isTsNode ? CRFTrainer : CRFMultiThreadTrainer
  },
  SVM: {
    Predictor,
    Trainer: isTsNode ? SVMTrainer : SVMMultiThreadTrainer
  },
  FastText: { Model: FastTextModel },
  SentencePiece: { createProcessor: processor }
}

export default MLToolkit
