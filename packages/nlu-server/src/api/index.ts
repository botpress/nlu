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
import { ModelLoadedData } from '../application/app-observer'
import { Training } from '../infrastructure/training-repo/typings'
import {
  initPrometheus,
  modelMemoryLoadDuration,
  modelStorageReadDuration,
  trainingCount,
  trainingDuration
} from '../telemetry/metric'
import { initTracing } from '../telemetry/trace'
import { InvalidRequestFormatError } from './errors'
import { handleError, getAppId } from './http'

import { validatePredictInput, validateTrainInput, validateDetectLangInput } from './validation'
type APIOptions = {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  tracingEnabled?: boolean
  prometheusEnabled?: boolean
  apmEnabled?: boolean
  apmSampleRate?: number
}

const { modelIdService } = NLUEngine

export const createAPI = async (options: APIOptions, app: Application, baseLogger: Logger): Promise<ExpressApp> => {
  const requestLogger = baseLogger.sub('api').sub('request')
  const expressApp = express()

  expressApp.use(cors())

  if (options.prometheusEnabled) {
    app.on('training_update', async (training: Training) => {
      if (training.status !== 'canceled' && training.status !== 'done' && training.status !== 'errored') {
        return
      }

      if (training.trainingTime) {
        trainingDuration.observe({ status: training.status }, training.trainingTime / 1000)
      }
    })

    app.on('model_loaded', async (data: ModelLoadedData) => {
      modelStorageReadDuration.observe(data.readTime)
      modelMemoryLoadDuration.observe(data.loadTime)
    })

    await initPrometheus(expressApp, async () => {
      const count = await app.getLocalTrainingCount()
      trainingCount.set(count)
    })
  }

  if (options.tracingEnabled) {
    await initTracing('nlu')
  }

  if (options.apmEnabled) {
    Sentry.init({
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app: expressApp })
      ],
      sampleRate: options.apmSampleRate ?? 1.0
    })

    expressApp.use(Sentry.Handlers.errorHandler())
    expressApp.use(Sentry.Handlers.requestHandler())
    expressApp.use(Sentry.Handlers.tracingHandler())
  }

  expressApp.use(bodyParser.json({ limit: options.bodySize }))

  expressApp.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress NLU')
    requestLogger.debug(`incoming ${req.method} ${req.path}`, { ip: req.ip })
    next()
  })

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

  const router = express.Router({ mergeParams: true })

  expressApp.use(['/v1', '/'], router)

  router.get('/', async (req, res, next) => {
    try {
      return res.redirect('/info')
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

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
      const appId = getAppId(req)
      const modelIds = await app.getModels(appId)
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.ListModelsResponseBody = { success: true, models: stringIds }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/models/prune', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const modelIds = await app.pruneModels(appId)
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.PruneModelsResponseBody = { success: true, models: stringIds }
      return res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/train', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const input = await validateTrainInput(req.body)
      const { intents, entities, seed, language } = input

      const pickedSeed = seed ?? Math.round(Math.random() * 10000)

      const trainInput: TrainInput = {
        intents,
        entities,
        language,
        seed: pickedSeed
      }

      const modelId = await app.startTraining(appId, trainInput)

      const resp: http.TrainResponseBody = { success: true, modelId: NLUEngine.modelIdService.toString(modelId) }
      return res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.get('/train', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const { lang } = req.query
      if (lang && !_.isString(lang)) {
        throw new InvalidRequestFormatError(`query parameter lang: "${lang}" has invalid format`)
      }

      const trainings = await app.getAllTrainings(appId, lang)
      const serialized = trainings.map(({ modelId, ...state }) => ({
        modelId: modelIdService.toString(modelId),
        ...state
      }))

      const resp: http.ListTrainingsResponseBody = { success: true, trainings: serialized }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.get('/train/:modelId', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const { modelId: stringId } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const session = await app.getTrainingState(appId, modelId)

      const resp: http.TrainProgressResponseBody = { success: true, session }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/train/:modelId/cancel', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const { modelId: stringId } = req.params

      const modelId = NLUEngine.modelIdService.fromString(stringId)

      await app.cancelTraining(appId, modelId)

      const resp: http.SuccessReponse = { success: true }
      return res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/predict/:modelId', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const { modelId: stringId } = req.params
      const { utterances } = await validatePredictInput(req.body)

      if (!_.isArray(utterances) || (options.batchSize > 0 && utterances.length > options.batchSize)) {
        throw new InvalidRequestFormatError(
          `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        )
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const predictions = await app.predict(appId, modelId, utterances)

      const resp: http.PredictResponseBody = { success: true, predictions }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  router.post('/detect-lang', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const { utterances, models } = await validateDetectLangInput(req.body)

      const invalidIds = models.filter(_.negate(modelIdService.isId))
      if (invalidIds.length) {
        throw new InvalidRequestFormatError(`The following model ids are invalid: [${invalidIds.join(', ')}]`)
      }

      const modelIds = models.map(modelIdService.fromString)

      if (!_.isArray(utterances) || (options.batchSize > 0 && utterances.length > options.batchSize)) {
        const error = `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        return res.status(400).send({ success: false, error })
      }

      const detectedLanguages = await app.detectLanguage(appId, modelIds, utterances)

      const resp: http.DetectLangResponseBody = { success: true, detectedLanguages }
      res.send(resp)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  return expressApp
}
