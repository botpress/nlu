import _ from 'lodash'
import os from 'os'

import { deserializeError, ErrorMessage } from '../utils/error-utils'
import { MLThreadScheduler } from './ml-thread-scheduler'
import { MLToolkit } from './typings'

type MsgType =
  | 'svm_train'
  | 'svm_progress'
  | 'svm_done'
  | 'svm_error'
  | 'crf_train'
  | 'crf_progress'
  | 'crf_done'
  | 'crf_error'

type Payload = Partial<{
  progress: number
  result: string
  error: ErrorMessage
  points: (MLToolkit.SVM.DataPoint | MLToolkit.CRF.DataPoint)[]
  options: MLToolkit.SVM.SVMOptions | MLToolkit.CRF.TrainerOptions | undefined
}>

export interface Message {
  type: MsgType
  id: string
  payload: Payload
}

export class MLThreadPool {
  private mlThreadsScheduler: MLThreadScheduler

  constructor() {
    const maxMLThreads = Math.max(os.cpus().length - 1, 1) // ncpus - webworker
    const userMlThread = process.env.BP_NUM_ML_THREADS ? Number(process.env.BP_NUM_ML_THREADS) : 4
    const numMLThreads = Math.min(maxMLThreads, userMlThread)
    this.mlThreadsScheduler = new MLThreadScheduler(numMLThreads)
  }

  public async startSvmTraining(
    trainingId: string,
    points: MLToolkit.SVM.DataPoint[],
    options: MLToolkit.SVM.SVMOptions | undefined,
    progress: MLToolkit.SVM.TrainProgressCallback | undefined,
    complete: (model: string) => void,
    error: (error: Error) => void
  ) {
    return this.startTraining('svm', trainingId, points, options, progress, complete, error)
  }

  // TODO: maybe CRF training should have its own dedicated ml thread
  public async startCrfTraining(
    trainingId: string,
    points: MLToolkit.CRF.DataPoint[],
    options: MLToolkit.CRF.TrainerOptions,
    progress: ((iteration: number) => void) | undefined,
    complete: (modelFilePath: string) => void,
    error: (error: Error) => void
  ) {
    return this.startTraining('crf', trainingId, points, options, progress, complete, error)
  }

  private async startTraining(
    trainingType: 'svm' | 'crf',
    trainingId: string,
    points: MLToolkit.SVM.DataPoint[] | MLToolkit.CRF.DataPoint[],
    options: MLToolkit.SVM.SVMOptions | MLToolkit.CRF.TrainerOptions | undefined,
    progress: MLToolkit.SVM.TrainProgressCallback | MLToolkit.CRF.TrainProgressCallback | undefined,
    complete: (model: string) => void,
    error: (error: Error) => void
  ) {
    const worker = await this.mlThreadsScheduler.getNext()

    const messageHandler = (msg: Message) => {
      if (msg.id !== trainingId) {
        return
      }

      const isProgress = msg.type === 'svm_progress' || msg.type === 'crf_progress'
      if (progress && isProgress) {
        try {
          progress(msg.payload.progress!)
        } catch (err) {
          error(err)
          worker.off('message', messageHandler)
        }
      }

      if (msg.type === 'svm_done' || msg.type === 'crf_done') {
        complete(msg.payload.result!)
        worker.off('message', messageHandler)
      }

      if (msg.type === 'svm_error' || msg.type === 'crf_error') {
        error(deserializeError(msg.payload.error!))
        worker.off('message', messageHandler)
      }
    }

    const type: MsgType = trainingType === 'svm' ? 'svm_train' : 'crf_train'
    const msg: Message = { type, id: trainingId, payload: { points, options } }
    worker.postMessage(msg)
    worker.on('message', messageHandler)
  }
}
