import * as NLUEngine from '@botpress/nlu-engine'
import { Logger } from '@bpinternal/log4bot'
import bodyParser from 'body-parser'
import express, { Router, Request, Response, NextFunction } from 'express'

import _ from 'lodash'
import { Application } from '../../application'
import { NLUServerOptions } from '../../typings'
import { getAppId } from '../app-id'
import { InvalidRequestFormatError, ResponseError } from '../errors'

const handleError = (logger: Logger) => (thrownObject: any, _req: Request, res: Response, _next: NextFunction) => {
  const error: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)
  const code = error instanceof ResponseError ? error.statusCode : 500
  if (code >= 500) {
    logger.attachError(error).error('Internal Error')
  }
  return res.sendStatus(code)
}

export const createModelTransferRouter = (options: NLUServerOptions, app: Application, baseLogger: Logger): Router => {
  const apiLogger = baseLogger.sub('api')

  const router = express.Router({ mergeParams: true })
  router.use(bodyParser.raw({ limit: options.modelSize }))

  router.get('/:modelId', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const { modelId: stringId } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const modelWeights = await app.getModelWeights(appId, modelId)

      res.send(modelWeights) // express takes care of chunking
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.post('/', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      if (!req.body || !(req.body instanceof Buffer)) {
        throw new InvalidRequestFormatError('request body has invalid format')
      }
      const modelWeights = req.body
      await app.setModelWeights(appId, modelWeights)

      res.sendStatus(200)
      return next()
    } catch (thrown) {
      return next(thrown)
    }
  })

  router.use(handleError(apiLogger))

  return router
}
