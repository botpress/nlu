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
import { NLUServerOptions } from '..'
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
import { UsageClient } from '../telemetry/usage-client'
import { createModelTransferRouter } from './routers/model-transfer'
import { createRootRouter } from './routers/root'

const { modelIdService } = NLUEngine

const isTrainingRunning = ({ status }: Training) => status === 'training-pending' || status === 'training'

export const createAPI = async (
  options: NLUServerOptions,
  app: Application,
  baseLogger: Logger
): Promise<ExpressApp> => {
  const apiLogger = baseLogger.sub('api')
  const requestLogger = apiLogger.sub('request')
  const expressApp = express()

  expressApp.use(cors())

  if (options.prometheusEnabled) {
    const prometheusLogger = apiLogger.sub('prometheus')
    prometheusLogger.debug('prometheus metrics enabled')

    app.on('training_update', async (training: Training) => {
      if (isTrainingRunning(training) || !training.trainingTime) {
        return
      }

      const trainingTime = training.trainingTime / 1000
      prometheusLogger.debug(`adding metric "training_duration_seconds" with value: ${trainingTime}`)
      trainingDuration.observe({ status: training.status }, trainingTime)
    })

    app.on('model_loaded', async (data: ModelLoadedData) => {
      prometheusLogger.debug(`adding metric "model_storage_read_duration" with value: ${data.readTime}`)
      modelStorageReadDuration.observe(data.readTime)

      prometheusLogger.debug(`adding metric "model_memory_load_duration" with value: ${data.loadTime}`)
      modelMemoryLoadDuration.observe(data.loadTime)
    })

    await initPrometheus(expressApp, async () => {
      const count = await app.getLocalTrainingCount()
      trainingCount.set(count)
    })
  }

  if (options.usageURL) {
    const usageLogger = apiLogger.sub('usage')
    usageLogger.debug('usage endpoint enabled')

    const usageClient = new UsageClient(options.usageURL)
    app.on('training_update', async (training: Training) => {
      if (isTrainingRunning(training) || !training.trainingTime) {
        return
      }

      const { appId, modelId, trainingTime } = training
      const app_id = appId
      const model_id = modelIdService.toString(modelId)
      const training_time = trainingTime / 1000
      const timestamp = new Date().toISOString()

      const type = 'training_time'
      const value = {
        app_id,
        model_id,
        training_time,
        timestamp
      }

      usageLogger.debug(`sending usage ${type} with value: ${JSON.stringify(value)}`)

      try {
        await usageClient.sendUsage('nlu', type, [value])
      } catch (thrown) {
        const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
        usageLogger.attachError(err).error(`an error occured when sending "${type}" usage.`)
      }
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

    expressApp.use(Sentry.Handlers.requestHandler())
    expressApp.use(Sentry.Handlers.tracingHandler())
  }

  expressApp.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress NLU')
    requestLogger.debug(`incoming ${req.method} ${req.path}`, { ip: req.ip })
    next()
  })

  if (options.apmEnabled) {
    expressApp.use(Sentry.Handlers.errorHandler())
  }

  if (options.reverseProxy) {
    expressApp.set('trust proxy', options.reverseProxy)
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

  const rootRouter = createRootRouter(options, app, baseLogger)
  const modelRouter = createModelTransferRouter(options, app, baseLogger)

  expressApp.use('/', rootRouter)
  expressApp.use('/modelweights', modelRouter)

  return expressApp
}
