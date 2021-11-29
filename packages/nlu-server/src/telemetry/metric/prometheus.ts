import { createMiddleware, defaultNormalizers } from '@promster/express'
import { getSummary, getContentType } from '@promster/metrics'
import { Express, Request } from 'express'
import listEndpoints from 'express-list-endpoints'
import * as http from 'http'
import url from 'url'
import UrlPattern from 'url-pattern'

interface Route {
  methods: string[]
  pattern: string
  path: UrlPattern
}

const captureAllRoutes = (app: Express) => {
  const endpoints = listEndpoints(app).filter((route) => route.path !== '/*' && route.path !== '*')

  const routes = endpoints.map((route) => {
    if (route.path.endsWith('/')) {
      route.path = route.path.replace(/\/$/, '')
    }

    return {
      methods: route.methods,
      pattern: route.path,
      path: new UrlPattern(route.path, {
        segmentNameCharset: 'a-zA-Z0-9_-'
      })
    }
  })

  return routes
}

const normalizePath = (app: Express) => {
  const allRoutes: Route[] = []

  return ({ req }: { req: Request }) => {
    if (!allRoutes.length) {
      captureAllRoutes(app).forEach((route) => allRoutes.push(route))
    }

    let pattern: string | null = null
    let path = url.parse(req.originalUrl || req.url).pathname || ''

    if (path && path.endsWith('/')) {
      path = path.replace(/\/$/, '')
    }

    allRoutes.some((route) => {
      if (route.methods.indexOf(req.method) === -1) {
        return false
      }

      if (route.path.match(path)) {
        pattern = route.pattern
        return true
      }

      return false
    })

    if (pattern === null) {
      return false
    }

    return pattern || path
  }
}

const createServer = (onRequest?: () => Promise<void>) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(async (_req, res) => {
      if (onRequest) {
        await onRequest()
      }

      res.writeHead(200, 'OK', { 'content-type': getContentType() })
      res.end(await getSummary())
    })

    server.listen(9090, '0.0.0.0', () => {
      server.on('error', reject)
      resolve(server)
    })
  })

export const initPrometheus = async (app: Express, onRequest?: () => Promise<void>) => {
  app.use(
    createMiddleware({
      app,
      options: {
        ...defaultNormalizers,
        normalizePath: normalizePath(app),
        buckets: [0.05, 0.1, 0.5, 1, 3]
      }
    })
  )

  await createServer(onRequest)
}
