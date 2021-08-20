import { Logger } from '@botpress/logger'
import { http, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Application as ExpressApp } from 'express'
import rateLimit from 'express-rate-limit'

import _ from 'lodash'
import ms from 'ms'
import { Application } from '../application'
import { InvalidRequestFormatError } from './errors'

import { authMiddleware, handleError } from './http'
import {
  validateCredentialsFormat,
  validatePredictInput,
  validateTrainInput,
  validateDetectLangInput
} from './validation/validate'

export interface APIOptions {
  host: string
  port: number
  authToken?: string
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  modelCacheSize: string
  dbURL?: string
  modelDir?: string
  verbose: number
  doc: boolean
  logFilter?: string[]
  apmEnabled?: boolean
  apmSampleRate?: number
}

const { modelIdService } = NLUEngine

export const createAPI = async (options: APIOptions, app: Application, baseLogger: Logger): Promise<ExpressApp> => {
  const requestLogger = baseLogger.sub('api').sub('request')
  const expressApp = express()

  // This must be first, otherwise the /info endpoint can't be called when token is used
  expressApp.use(cors())

  if (options.apmEnabled) {
    Sentry.init({
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app: expressApp })
      ],
      sampleRate: options.apmSampleRate ?? 1.0
    })

    expressApp.use(Sentry.Handlers.requestHandler())
    expressApp.use(Sentry.Handlers.tracingHandler())
  }

  expressApp.use(bodyParser.json({ limit: options.bodySize }))

  expressApp.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress NLU')
    requestLogger.debug(`incoming ${req.path}`, { ip: req.ip })
    next()
  })

  if (options.apmEnabled) {
    expressApp.use(Sentry.Handlers.errorHandler())
  }

  expressApp.use(handleError)

  if (process.env.REVERSE_PROXY) {
    expressApp.set('trust proxy', process.env.REVERSE_PROXY)
  }

  if (options.limit > 0) {
    expressApp.use(
      rateLimit({
        windowMs: ms(options.limitWindow),
        max: options.limit,
        message: 'Too many requests, please slow down'
      })
    )
  }

  if (options.authToken?.length) {
    expressApp.use(authMiddleware(options.authToken, baseLogger))
  }

  const router = express.Router({ mergeParams: true })

  expressApp.use(['/v1', '/'], router)

  router.get('/info', async (req, res, next) => {
    try {
      const info = app.getInfo()
      const resp: http.InfoResponseBody = { success: true, info }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.get('/models', async (req, res, next) => {
    try {
      const { appSecret, appId } = await validateCredentialsFormat(req.query)
      const modelIds = await app.getModels({ appSecret, appId })
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.ListModelsResponseBody = { success: true, models: stringIds }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/models/prune', async (req, res, next) => {
    try {
      const { appSecret, appId } = await validateCredentialsFormat(req.body)
      const modelIds = await app.pruneModels({ appSecret, appId })
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.PruneModelsResponseBody = { success: true, models: stringIds }
      return res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/train', async (req, res, next) => {
    try {
      const input = await validateTrainInput(req.body)
      const { intents, entities, seed, language, appSecret, appId } = input

      const pickedSeed = seed ?? Math.round(Math.random() * 10000)

      const trainInput: TrainInput = {
        intents,
        entities,
        language,
        seed: pickedSeed
      }

      const modelId = app.startTraining(trainInput, { appId, appSecret })

      const resp: http.TrainResponseBody = { success: true, modelId: NLUEngine.modelIdService.toString(modelId) }
      return res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.get('/train/:modelId', async (req, res, next) => {
    try {
      const { modelId: stringId } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }

      const { appSecret, appId } = await validateCredentialsFormat(req.query)

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const session = await app.getTrainingState(modelId, { appId, appSecret })

      const resp: http.TrainProgressResponseBody = { success: true, session }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/train/:modelId/cancel', async (req, res, next) => {
    try {
      const { modelId: stringId } = req.params
      const { appSecret, appId } = await validateCredentialsFormat(req.body)

      const modelId = NLUEngine.modelIdService.fromString(stringId)

      await app.cancelTraining(modelId, { appId, appSecret })
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/predict/:modelId', async (req, res, next) => {
    try {
      const { modelId: stringId } = req.params
      const { utterances, appId, appSecret } = await validatePredictInput(req.body)

      if (!_.isArray(utterances) || (options.batchSize > 0 && utterances.length > options.batchSize)) {
        throw new InvalidRequestFormatError(
          `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        )
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const predictions = await app.predict(utterances, modelId, { appId, appSecret })

      const resp: http.PredictResponseBody = { success: true, predictions }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/detect-lang', async (req, res, next) => {
    try {
      const { utterances, appId, appSecret, models } = await validateDetectLangInput(req.body)

      const invalidIds = models.filter(_.negate(modelIdService.isId))
      if (invalidIds.length) {
        throw new InvalidRequestFormatError(`The following model ids are invalid: [${invalidIds.join(', ')}]`)
      }

      const modelIds = models.map(modelIdService.fromString)

      if (!_.isArray(utterances) || (options.batchSize > 0 && utterances.length > options.batchSize)) {
        const error = `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        return res.status(400).send({ success: false, error })
      }

      const detectedLanguages = await app.detectLanguage(utterances, modelIds, { appId, appSecret })

      const resp: http.DetectLangResponseBody = { success: true, detectedLanguages }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  return expressApp
}
