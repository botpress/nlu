import { Client as NLUClient, TrainingState } from '@botpress/nlu-client'
import Bluebird from 'bluebird'
import { UnsuccessfullAPICall } from '../errors'

export type TrainPredicate = (ts: TrainingState) => boolean

export type PollingArgs = {
  appId: string
  modelId: string
  nluClient: NLUClient
  condition: TrainPredicate
  maxTime: number
}

const timeout = (ms: number) =>
  new Promise<never>((_resolve, reject) =>
    setTimeout(() => {
      reject(new Error(`Timeout of ${ms} ms reached`))
    }, ms)
  )

export const pollTrainingUntil = async (args: PollingArgs): Promise<TrainingState> => {
  const { appId, condition, maxTime, modelId, nluClient } = args
  const interval = maxTime / 10

  const trainUntilPromise = new Promise<TrainingState>((resolve, reject) => {
    const int = setInterval(async () => {
      try {
        const trainStatusRes = await nluClient.getTrainingStatus(appId, modelId)
        if (!trainStatusRes.success) {
          clearInterval(int)
          reject(new UnsuccessfullAPICall(trainStatusRes.error))
          return
        }

        const { session } = trainStatusRes
        if (condition(session)) {
          clearInterval(int)
          resolve(session)
          return
        }
      } catch (thrown) {
        clearInterval(int)
        reject(thrown)
      }
    }, interval)
  })

  return Bluebird.race([timeout(maxTime), trainUntilPromise])
}
