import { workerData, parentPort } from 'worker_threads'

const processData = workerData?.processData
if (processData) {
  Object.assign(process, processData)
}

if (workerData?.processEnv) {
  Object.assign(process.env, workerData.processEnv)
}

// eslint-disable-next-line import/order
import { serializeError } from '../utils/error-utils'
import { Trainer as CrfTrainer } from './crf'
import { Message } from './ml-thread-pool'
import { Trainer as SvmTrainer } from './svm'
import { MLToolkit } from './typings'

// Debugging currently not possible in this file and beyond...

async function messageHandler(msg: Message) {
  if (msg.type === 'svm_train') {
    let svmProgressCalls = 0

    const progressCb = (progress: number) => {
      if (++svmProgressCalls % 10 === 0 || progress === 1) {
        const response: Message = { type: 'svm_progress', id: msg.id, payload: { progress } }
        parentPort?.postMessage(response)
      }
    }
    try {
      const { points, options } = msg.payload

      const trainer = new SvmTrainer()
      const result = await trainer.train(
        points as MLToolkit.SVM.DataPoint[],
        options as MLToolkit.SVM.SVMOptions,
        progressCb
      )
      const response: Message = { type: 'svm_done', id: msg.id, payload: { result } }
      parentPort?.postMessage(response)
    } catch (err) {
      const response: Message = { type: 'svm_error', id: msg.id, payload: { error: serializeError(err) } }
      parentPort?.postMessage(response)
    }
  }

  if (msg.type === 'crf_train') {
    const { points, options } = msg.payload

    const progressCb = (iteration: number) => {
      const progressMsg: Message = { type: 'crf_progress', id: msg.id, payload: { progress: iteration } }
      parentPort?.postMessage(progressMsg)
    }

    try {
      const trainer = new CrfTrainer()
      await trainer.initialize()
      const result = await trainer.train(
        points as MLToolkit.CRF.DataPoint[],
        options as MLToolkit.CRF.TrainerOptions,
        progressCb
      )
      const response: Message = { type: 'crf_done', id: msg.id, payload: { result } }
      parentPort?.postMessage(response)
    } catch (err) {
      const response: Message = { type: 'crf_error', id: msg.id, payload: { error: serializeError(err) } }
      parentPort?.postMessage(response)
    }
  }
}
parentPort?.on('message', messageHandler)
