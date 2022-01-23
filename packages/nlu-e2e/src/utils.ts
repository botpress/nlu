import { Client as NLUClient, LintingState, TrainingState } from '@botpress/nlu-client'
import Bluebird from 'bluebird'
import { UnsuccessfullAPICall } from './errors'

export type TrainLintPredicate<T extends LintingState | TrainingState> = (state: T) => boolean
export type PollingArgs<T extends LintingState | TrainingState> = {
  appId: string
  modelId: string
  nluClient: NLUClient
  condition: TrainLintPredicate<T>
  maxTime: number
}

const DEFAULT_POLLING_INTERVAL = 500

const timeout = (ms: number) =>
  new Promise<never>((_resolve, reject) =>
    setTimeout(() => {
      reject(new Error(`Timeout of ${ms} ms reached`))
    }, ms)
  )

export const pollTrainingUntil = async (args: PollingArgs<TrainingState>): Promise<TrainingState> => {
  const { appId, condition, maxTime, modelId, nluClient } = args
  const interval = maxTime < 0 ? DEFAULT_POLLING_INTERVAL : maxTime / 20

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

  if (maxTime < 0) {
    return trainUntilPromise
  }
  return Bluebird.race([timeout(maxTime), trainUntilPromise])
}

export const pollLintingUntil = async (args: PollingArgs<LintingState>): Promise<LintingState> => {
  const { appId, condition, maxTime, modelId, nluClient } = args
  const interval = maxTime < 0 ? DEFAULT_POLLING_INTERVAL : maxTime / 20

  const lintUntilPromise = new Promise<LintingState>((resolve, reject) => {
    const int = setInterval(async () => {
      try {
        const lintStatusRes = await nluClient.getLintingStatus(appId, modelId)
        if (!lintStatusRes.success) {
          clearInterval(int)
          reject(new UnsuccessfullAPICall(lintStatusRes.error))
          return
        }

        const { session } = lintStatusRes
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

  if (maxTime < 0) {
    return lintUntilPromise
  }
  return Bluebird.race([timeout(maxTime), lintUntilPromise])
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
