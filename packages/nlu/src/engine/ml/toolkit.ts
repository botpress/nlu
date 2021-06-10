import _ from 'lodash'
import kmeans from 'ml-kmeans'

import { Tagger } from './crf'
import { MultiThreadTrainer as CRFMultiThreadTrainer } from './crf/multi-thread-trainer'
import { FastTextModel } from './fasttext'
import { processor } from './sentencepiece'
import { Predictor } from './svm'
import { MultiThreadTrainer as SVMMultiThreadTrainer } from './svm/multi-thread-trainer'
import { MLToolkit as IMLToolkit } from './typings'

const MLToolkit: typeof IMLToolkit = {
  KMeans: {
    kmeans
  },
  CRF: {
    Tagger,
    Trainer: CRFMultiThreadTrainer
  },
  SVM: {
    Predictor,
    Trainer: SVMMultiThreadTrainer
  },
  FastText: { Model: FastTextModel },
  SentencePiece: { createProcessor: processor }
}

export default MLToolkit
