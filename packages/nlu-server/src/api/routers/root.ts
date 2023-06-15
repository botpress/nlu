import { http, TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import { Logger } from '@bpinternal/log4bot'
import bodyParser from 'body-parser'
import express, { Router, Request, Response, NextFunction } from 'express'

import _ from 'lodash'
import { Application } from '../../application'
import {
  ModelDoesNotExistError,
  TrainingNotFoundError,
  TrainingAlreadyStartedError,
  LangServerCommError,
  DucklingCommError,
  DatasetValidationError,
  LintingNotFoundError
} from '../../application/errors'
import { NLUServerOptions } from '../../typings'

import { getAppId } from '../app-id'
import { InvalidRequestFormatError, InvalidTrainSetError } from '../errors'
import { orderKeys } from '../order-keys'

import {
  validatePredictInput,
  validateTrainInput,
  validateDetectLangInput,
  validateLintInput,
  isLintingSpeed
} from '../validation/validate'

const { modelIdService } = NLUEngine

const serializeError = (err: Error): http.NLUError => {
  const { message, stack } = err
  if (err instanceof ModelDoesNotExistError) {
    const { statusCode } = err
    return { message, stack, type: 'model_not_found', code: statusCode }
  }
  if (err instanceof TrainingNotFoundError) {
    const { statusCode } = err
    return { message, stack, type: 'training_not_found', code: statusCode }
  }
  if (err instanceof LintingNotFoundError) {
    const { statusCode } = err
    return { message, stack, type: 'linting_not_found', code: statusCode }
  }
  if (err instanceof TrainingAlreadyStartedError) {
    const { statusCode } = err
    return { message, stack, type: 'training_already_started', code: statusCode }
  }
  if (err instanceof InvalidRequestFormatError) {
    const { statusCode } = err
    return { message, stack, type: 'request_format', code: statusCode }
  }
  if (err instanceof LangServerCommError) {
    const { statusCode } = err
    return { message, stack, type: 'lang-server', code: statusCode }
  }
  if (err instanceof DucklingCommError) {
    const { statusCode } = err
    return { message, stack, type: 'duckling-server', code: statusCode }
  }
  if (err instanceof DatasetValidationError || err instanceof InvalidTrainSetError) {
    const { statusCode } = err
    return { message, stack, type: 'dataset_format', code: statusCode }
  }
  return { message, stack, type: 'internal', code: 500 }
}

const handleError = (logger: Logger) => (thrownObject: any, _req: Request, res: Response, _next: NextFunction) => {
  const error: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)
  const nluError = serializeError(error)
  const { code } = nluError
  if (code >= 500) {
    logger.attachError(error).error('Internal Error')
  }
  const resp: http.ErrorResponse = { success: false, error: nluError }
  return res.status(code).send(resp)
}

export const createRootRouter = (options: NLUServerOptions, app: Application, baseLogger: Logger): Router => {
  const apiLogger = baseLogger.sub('api')

  const router = express.Router({ mergeParams: true })
  router.use(bodyParser.json({ limit: options.bodySize }))

  router.get('/', async (req, res, next) => {
    try {
      res.redirect('/info')
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.get('/info', async (req, res, next) => {
    try {
      const infoCloud = app.getInfo()
      const info = {
        health: {
          isEnabled: true,
          validProvidersCount: 1,
          validLanguages: infoCloud.languages
        },
        specs: {
          engineVersion: infoCloud.version,
          nluVersion: infoCloud.version,
          languageServer: {
            dimensions: infoCloud.specs.languageServer.dimensions,
            domain: infoCloud.specs.languageServer.domain,
            version: infoCloud.specs.languageServer.version
          }
        },
        languages: infoCloud.languages,
        version: infoCloud.version,
        modelTransferEnabled: false
      }
      const resp: http.InfoResponseBody = { success: true, info }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.get('/models', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const modelIds = await app.getModels(appId)
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.ListModelsResponseBody = { success: true, models: stringIds }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/models/prune', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const modelIds = await app.pruneModels(appId)
      const stringIds = modelIds.map(modelIdService.toString)
      const resp: http.PruneModelsResponseBody = { success: true, models: stringIds }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/train', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const input = await validateTrainInput(req.body)
      const { intents, entities, seed, language } = input

      const pickedSeed = seed ?? Math.round(Math.random() * 10000)

      const content = orderKeys({
        entities: _.orderBy(entities, (e) => e.name),
        intents: _.orderBy(intents, (i) => i.name)
      })

      const trainInput: TrainInput = {
        ...content,
        language,
        seed: pickedSeed
      }

      const modelId = await app.startTraining(appId, trainInput)

      const resp: http.TrainResponseBody = { success: true, modelId: NLUEngine.modelIdService.toString(modelId) }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
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
      return next()
    } catch (thrown) {
      return next(thrown)
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
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/train/:modelId/cancel', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const { modelId: stringId } = req.params

      const modelId = NLUEngine.modelIdService.fromString(stringId)

      await app.cancelTraining(appId, modelId)

      const resp: http.SuccessReponse = { success: true }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
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
      return next()
    } catch (thrown) {
      return next(thrown)
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
        const thrownor = `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        return res.status(400).send({ success: false, thrownor })
      }

      const detectedLanguages = await app.detectLanguage(appId, modelIds, utterances)

      const resp: http.DetectLangResponseBody = { success: true, detectedLanguages }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/lint', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const input = await validateLintInput(req.body)
      const { intents, entities, language, speed } = input

      const trainInput: TrainInput = {
        intents,
        entities,
        language,
        seed: 0
      }

      const modelId = await app.startLinting(appId, speed, trainInput)

      const resp: http.LintResponseBody = { success: true, modelId: NLUEngine.modelIdService.toString(modelId) }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.get('/lint/:modelId/:speed', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const { modelId: stringId, speed } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }
      if (!isLintingSpeed(speed)) {
        throw new InvalidRequestFormatError(`path param "${speed}" is not a valid linting speed.`)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const session = await app.getLintingState(appId, modelId, speed)

      const resp: http.LintProgressResponseBody = {
        success: true,
        session
      }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/lint/:modelId/:speed/cancel', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const { modelId: stringId, speed } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }
      if (!isLintingSpeed(speed)) {
        throw new InvalidRequestFormatError(`path param "${speed}" is not a valid linting speed.`)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)

      await app.cancelLinting(appId, modelId, speed)

      const resp: http.SuccessReponse = { success: true }
      res.send(resp)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.use(handleError(apiLogger))

  return router
}
