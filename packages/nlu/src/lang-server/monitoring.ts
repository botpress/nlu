import _ from 'lodash'
import ms from 'ms'
import onHeaders from 'on-headers'
import DEBUG from '../utils/simple-logger/debug'

const debugMonitor = DEBUG('api').sub('monitoring')

let collectionEnabled = false
let metrics = {}

export const startMonitoring = () => {
  debugMonitor('Metrics collection enabled. Interval: ', process.env.MONITORING_INTERVAL)

  setInterval(() => {
    if (!metrics || !Object.keys(metrics).length) {
      return
    }

    try {
      debugMonitor(
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
