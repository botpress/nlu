import { Logger } from '@botpress/logger'
import { models } from '@botpress/nlu-client'
import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Application as ExpressApp, Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'fs'

import _ from 'lodash'
import ms from 'ms'
import { nanoid } from 'nanoid'
import path from 'path'
import { ModelTransferError } from './error'

type APIOptions = {
  host: string
  port: number
  limitWindow: string
  limit: number
  bodySize: string | number
  reverseProxy?: string
  modelDir: string
  modelTTL: string | number
}

const handleError = (logger: Logger) => (thrownObject: any, _req: Request, res: Response, _next: NextFunction) => {
  const error: Error = thrownObject instanceof Error ? thrownObject : new Error(`${thrownObject}`)
  const code = error instanceof ModelTransferError ? error.httpCode : 500
  if (code >= 500) {
    logger.attachError(error).error('Internal Error')
  }
  res.sendStatus(code)
}

export const createAPI = async (
  options: APIOptions,
  serverVersion: string,
  baseLogger: Logger
): Promise<ExpressApp> => {
  const apiLogger = baseLogger.sub('api')
  const requestLogger = apiLogger.sub('request')
  const expressApp = express()

  expressApp.use(cors())

  expressApp.use(bodyParser.raw({ limit: options.bodySize }))

  expressApp.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress NLU')
    requestLogger.debug(`incoming ${req.method} ${req.path}`, { ip: req.ip })
    next()
  })

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

  const { modelDir, modelTTL } = options

  const getFilePath = (uuid: string) => path.join(modelDir, uuid)

  expressApp.get('/', async (req, res, next) => {
    try {
      return res.redirect('/info')
    } catch (thrown) {
      next(thrown)
    }
  })

  expressApp.get('/info', async (req, res, next) => {
    try {
      const resp: models.ModelServerInfo = { version: serverVersion }
      res.send(resp)
    } catch (thrown) {
      next(thrown)
    }
  })

  expressApp.get('/:uuid', async (req, res, next) => {
    try {
      const { uuid } = req.params
      const filePath = getFilePath(uuid)
      if (!fs.existsSync(filePath)) {
        throw new ModelTransferError(404, 'file does not exist.')
      }
      res.download(filePath)
    } catch (thrown) {
      next(thrown)
    }
  })

  expressApp.post('/', async (req, res, next) => {
    try {
      const model: Buffer = req.body
      const uuid = nanoid()
      const ttl = _.isNumber(modelTTL) ? modelTTL : ms(modelTTL)
      await fs.promises.writeFile(getFilePath(uuid), model)
      const resp: models.UploadModelResponse = { uuid, ttl }
      res.send(resp)
    } catch (thrown) {
      next(thrown)
    }
  })

  expressApp.use(handleError(apiLogger))

  return expressApp
}
