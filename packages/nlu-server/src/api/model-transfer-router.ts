import { Logger } from '@botpress/logger'
import { http } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import bodyParser from 'body-parser'
import express, { Router as ExpressRouter } from 'express'

import _ from 'lodash'
import { Application } from '../application'
import { InvalidRequestFormatError } from './errors'
import { handleError, getAppId } from './http'
import { APIOptions } from './options'

export const createModelTransferRouter = (options: APIOptions, app: Application, baseLogger: Logger): ExpressRouter => {
  const modelTransferRouter = express.Router({ mergeParams: true })
  modelTransferRouter.use(bodyParser.raw({ limit: options.bodySize }))

  modelTransferRouter.get('/:modelId', async (req, res, next) => {
    try {
      const appId = getAppId(req)
      const { modelId: stringId } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        throw new InvalidRequestFormatError(`model id "${stringId}" has invalid format`)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const modelBuffer = await app.getModelWeigths(appId, modelId)

      // express takes care of setting proper headers and chunking
      res.send(modelBuffer)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  modelTransferRouter.post('/', async (req, res, next) => {
    try {
      const appId = getAppId(req)

      const modelBuffer = req.body
      if (!_.isBuffer(modelBuffer)) {
        throw new InvalidRequestFormatError('request body has invalid format')
      }

      await app.setModelWeigths(appId, modelBuffer)
      const successReponse: http.SuccessReponse = { success: true }
      res.send(successReponse)
    } catch (err) {
      return handleError(err, req, res, next)
    }
  })

  return modelTransferRouter
}
