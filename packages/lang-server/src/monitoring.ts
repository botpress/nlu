import { Logger } from '@botpress/logger'
import _ from 'lodash'
import ms from 'ms'
import onHeaders from 'on-headers'

let collectionEnabled = false
let metrics = {}

export const startMonitoring = (baseLogger: Logger) => {
  const monitoringLogger = baseLogger.sub('lang').sub('api').sub('monitoring')

  monitoringLogger.debug('Metrics collection enabled. Interval: ', process.env.MONITORING_INTERVAL)

  setInterval(() => {
    if (!metrics || !Object.keys(metrics).length) {
      return
    }

    try {
      monitoringLogger.debug(
        'Stats %o',
        _.flatMap(Object.keys(metrics), (lang) => ({
          [lang]: {
            requests: metrics[lang].requests,
            latency_avg: _.round(metrics[lang].latency / metrics[lang].requests, 2)
          }
        }))
      )
    } catch (err) {
      console.error('Could not prepare stats:', err)
    }
    metrics = {}
  }, ms(process.env.MONITORING_INTERVAL!))

  collectionEnabled = true
}

export const logMetric = (language: string = 'n/a', timeInMs: number) => {
  if (!collectionEnabled) {
    return
  }

  if (!metrics[language]) {
    metrics[language] = {
      requests: 1,
      latency: timeInMs
    }
  } else {
    metrics[language].requests++
    metrics[language].latency += timeInMs
  }
}

export const monitoringMiddleware = (req, res, next) => {
  const startAt = Date.now()

  onHeaders(res, () => {
    const timeInMs = Date.now() - startAt
    logMetric(req.body.lang, timeInMs)
    res.setHeader('X-Response-Time', `${timeInMs}ms`)
  })

  next()
}
