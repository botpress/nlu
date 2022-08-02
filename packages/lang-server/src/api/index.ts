import {
  InfoResponseBody,
  TokenizeResponseBody,
  VectorizeResponseBody,
  LanguagesResponseBody,
  DownloadLangResponseBody,
  SuccessReponse
} from '@botpress/lang-client'
import { prometheus } from '@botpress/telemetry'
import { Logger } from '@bpinternal/log4bot'
import trail from '@bpinternal/trail'
import { context, trace } from '@opentelemetry/api'
import * as Sentry from '@sentry/node'
import Bluebird from 'bluebird'
import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Application } from 'express'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import _ from 'lodash'
import ms from 'ms'

import { LangApplication } from '../application'

import { monitoringMiddleware, startMonitoring } from './monitoring'
import { authMiddleware } from './mw-authentification'
import { handleUnexpectedError } from './mw-handle-error'
import { serviceLoadingMiddleware } from './mw-service-loading'
import { validateTokenizeRequestBody, validateVectorizeRequestBody } from './validation/body'
import { extractPathLanguageMiddleware, RequestWithLang } from './validation/lang-path'

export type APIOptions = {
  version: string
  host: string
  port: number
  prometheusEnabled: boolean
  apmEnabled: boolean
  authToken?: string
  limitWindow: string
  limit: number
  adminToken: string
  reverseProxy?: string
}

const cachePolicy = { 'Cache-Control': `max-age=${ms('1d')}` }

const createExpressApp = async (options: APIOptions, baseLogger: Logger): Promise<Application> => {
  const app = express()
  const requestLogger = baseLogger.sub('api').sub('request')

  // This must be first, otherwise the /info endpoint can't be called when token is used
  app.use(cors())

  if (options.prometheusEnabled) {
    await prometheus.init(app)
  }

  app.use(bodyParser.json({ limit: '250kb' }))

  if (options.apmEnabled) {
    Sentry.init()
    app.use(Sentry.Handlers.requestHandler())
  }

  app.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress')

    const metadata: { ip: string; traceId?: string } = { ip: req.ip }

    if (trail.isEnabled()) {
      const spanContext = trace.getSpanContext(context.active())

      if (spanContext?.traceId) {
        metadata.traceId = spanContext?.traceId
      }
    }

    requestLogger.debug(`incoming ${req.method} ${req.path}`, metadata)
    next()
  })

  app.use(monitoringMiddleware)

  if (options.reverseProxy) {
    app.set('trust proxy', options.reverseProxy)
  }

  if (options.limit > 0) {
    app.use(
      rateLimit({
        windowMs: ms(options.limitWindow),
        max: options.limit,
        message: 'Too many requests, please slow down'
      })
    )
  }

  if (options.authToken && options.authToken.length) {
    // Both tokens can be used to query the language server
    app.use(authMiddleware(options.authToken, baseLogger, options.adminToken))
  }

  return app
}

export default async function (options: APIOptions, baseLogger: Logger, application: LangApplication) {
  const app = await createExpressApp(options, baseLogger)
  const logger = baseLogger.sub('lang').sub('api')

  const waitForServiceMw = serviceLoadingMiddleware(application.languageService)
  const validateLanguageMw = extractPathLanguageMiddleware(application.languageService)
  const adminTokenMw = authMiddleware(options.adminToken, baseLogger)
  const handleErr = handleUnexpectedError(logger)

  app.get('/info', (req, res, next) => {
    try {
      const info = application.getInfo(req.headers.authorization)
      const response: InfoResponseBody = {
        success: true,
        ...info
      }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  app.post('/tokenize/:lang', waitForServiceMw, validateLanguageMw, async (req: RequestWithLang, res, next) => {
    try {
      const { lang } = req.params
      const { utterances } = validateTokenizeRequestBody(req.body)
      const result = await application.tokenize(utterances, lang)
      const response: TokenizeResponseBody = {
        success: true,
        ...result
      }
      return res.set(cachePolicy).json(response)
    } catch (err) {
      return next(err)
    }
  })

  app.post('/vectorize/:lang', waitForServiceMw, validateLanguageMw, async (req: RequestWithLang, res, next) => {
    try {
      const { lang } = req.params
      const { tokens } = validateVectorizeRequestBody(req.body)
      const result = await application.vectorize(tokens, lang)
      const response: VectorizeResponseBody = {
        success: true,
        ...result
      }
      return res.set(cachePolicy).json(response)
    } catch (err) {
      return next(err)
    }
  })

  const router = express.Router({ mergeParams: true })

  router.get('/', (req, res, next) => {
    try {
      const result = application.getLanguages()
      const response: LanguagesResponseBody = {
        success: true,
        ...result
      }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  router.post('/:lang', adminTokenMw, validateLanguageMw, async (req: RequestWithLang, res, next) => {
    const { lang } = req.params
    try {
      const { downloadId } = await application.startDownloadLang(lang)
      const response: DownloadLangResponseBody = { success: true, downloadId }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  router.post('/:lang/delete', adminTokenMw, validateLanguageMw, async (req: RequestWithLang, res, next) => {
    try {
      const { lang } = req.params
      application.deleteLang(lang)
      const response: SuccessReponse = { success: true }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  router.post('/:lang/load', adminTokenMw, validateLanguageMw, async (req: RequestWithLang, res, next) => {
    try {
      const { lang } = req.params
      await application.loadLang(lang)
      const response: SuccessReponse = { success: true }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  router.post('/cancel/:id', adminTokenMw, (req, res, next) => {
    try {
      const { id } = req.params
      application.cancelDownloadLang(id)
      const response: SuccessReponse = { success: true }
      return res.json(response)
    } catch (err) {
      return next(err)
    }
  })

  app.use('/languages', waitForServiceMw, router)

  if (options.apmEnabled) {
    app.use(Sentry.Handlers.errorHandler())
  }

  app.use(handleErr)

  const httpServer = createServer(app)

  await Bluebird.fromCallback((callback) => {
    const hostname = options.host === 'localhost' ? undefined : options.host
    httpServer.listen(options.port, hostname, undefined, () => {
      callback(null)
    })
  })

  logger.info(`Language Server is ready at http://${options.host}:${options.port}/`)

  if (process.env.MONITORING_INTERVAL) {
    startMonitoring(baseLogger, process.env.MONITORING_INTERVAL)
  }
}
