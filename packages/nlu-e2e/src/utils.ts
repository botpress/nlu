import { Logger } from '@bpinternal/log4bot'
import { Client as NLUClient, IssueComputationSpeed, LintingState, TrainingState } from '@botpress/nlu-client'
import Bluebird from 'bluebird'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getAppDataPath } from './app-data'
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
const E2E_CACHE_DIR = 'e2e'

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

export const pollLintingUntil = async (
  args: PollingArgs<LintingState> & { speed: IssueComputationSpeed }
): Promise<LintingState> => {
  const { appId, condition, maxTime, modelId, nluClient, speed } = args
  const interval = maxTime < 0 ? DEFAULT_POLLING_INTERVAL : maxTime / 20

  const lintUntilPromise = new Promise<LintingState>((resolve, reject) => {
    const int = setInterval(async () => {
      try {
        const lintStatusRes = await nluClient.getLintingStatus(appId, modelId, speed)
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

export const getE2ECachePath = (appId?: string) => {
  const bpCachePath = getAppDataPath()
  if (!appId) {
    return path.join(bpCachePath, E2E_CACHE_DIR)
  }
  const uriEncodedAppId = encodeURIComponent(appId)
  return path.join(bpCachePath, E2E_CACHE_DIR, uriEncodedAppId)
}

export const syncE2ECachePath = async (logger: Logger, appId?: string) => {
  const bpCachePath = getAppDataPath()
  if (!fs.existsSync(bpCachePath)) {
    throw new Error('APP_DATA_PATH does not exist')
  }

  const e2eCachePath = getE2ECachePath()
  if (!fs.existsSync(e2eCachePath)) {
    logger.info('making e2e cache directory')
    await fs.promises.mkdir(e2eCachePath)
  } else {
    logger.debug('e2e cache directory already exists')
  }

  if (appId) {
    const uriEncodedAppId = encodeURIComponent(appId)
    await fs.promises.mkdir(path.join(e2eCachePath, uriEncodedAppId))
  }
}

export const corruptBuffer = (buffer: Buffer): Buffer => {
  const algorithm = 'aes-256-gcm'
  const key = crypto.randomBytes(32)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv)
  let encrypted = cipher.update(buffer)

  encrypted = Buffer.concat([encrypted, cipher.final()])

  return encrypted
}

export const bufferReplace = (buffer: Buffer, from: Buffer, to: Buffer): Buffer => {
  const patternStart = buffer.indexOf(from)
  if (patternStart < 0) {
    return buffer
  }

  const patternEnd = patternStart + from.length

  let result = Buffer.from([])
  buffer.copy(result)

  result = Buffer.concat([result, buffer.slice(0, patternStart)])
  result = Buffer.concat([result, to])
  result = Buffer.concat([result, buffer.slice(patternEnd, buffer.length)])

  return result
}
