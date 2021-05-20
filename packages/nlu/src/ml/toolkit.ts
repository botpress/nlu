import _ from 'lodash'
import kmeans from 'ml-kmeans'
import nanoid from 'nanoid'

import { Tagger, Trainer as CRFTrainer } from './crf'
import { FastTextModel } from './fasttext'
import { MLThreadPool } from './ml-thread-pool'
import { processor } from './sentencepiece'
import { Predictor, Trainer as SVMTrainer } from './svm'
import { MLToolkit as IMLToolkit } from './typings'

const MLToolkit: typeof IMLToolkit = {
  KMeans: {
    kmeans
  },
  CRF: {
    Tagger,
    Trainer: CRFTrainer
  },
  SVM: {
    Predictor,
    Trainer: SVMTrainer
  },
  FastText: { Model: FastTextModel },
  SentencePiece: { createProcessor: processor }
}

const workerPool = new MLThreadPool()

MLToolkit.SVM.Trainer.prototype.train = function (
  points: IMLToolkit.SVM.DataPoint[],
  options?: IMLToolkit.SVM.SVMOptions,
  progressCb?: IMLToolkit.SVM.TrainProgressCallback | undefined
): any {
  return new Promise(async (resolve, reject) => {
    const id = nanoid()
    await workerPool.startSvmTraining(id, points, options, progressCb, resolve, reject)
  })
}

MLToolkit.CRF.Trainer.prototype.train = (
  elements: IMLToolkit.CRF.DataPoint[],
  params: IMLToolkit.CRF.TrainerOptions,
  progressCb?: (iteration: number) => void
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const id = nanoid()
    await workerPool.startCrfTraining(id, elements, params, progressCb, resolve, reject)
  })
}

export default MLToolkit
