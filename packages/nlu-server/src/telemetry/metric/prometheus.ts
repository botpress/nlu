import { createMiddleware, defaultNormalizers } from '@promster/express'
import { getSummary, getContentType } from '@promster/metrics'
import { Express, Request } from 'express'
import * as http from 'http'

type Route = {
  prefix?: RegExp
  subroutes?: Route[]
  methods?: { [key: string]: boolean }
  regexp?: RegExp
  path: string
}

const NOT_FOUND = 'not_found'

const trimPrefix = (value: string, prefix: string) => (value.startsWith(prefix) ? value.slice(prefix.length) : value)

const getMiddlewareRoutes = (middleware: any) => {
  const routes: Route[] = []

  if (middleware.route) {
    routes.push({
      path: middleware.route.path,
      regexp: middleware.regexp,
      methods: middleware.route?.methods
    })
  }

  if (middleware.name === 'router' && middleware.handle.stack) {
    const subroutes: Route[] = []

    for (const subMiddleware of middleware.handle.stack) {
      subroutes.push(...getMiddlewareRoutes(subMiddleware))
    }

    if (subroutes.length) {
      routes.push({
        prefix: middleware.regexp,
        path: middleware.path || '',
        subroutes
      })
    }
  }

  return routes
}

const getRoutes = (app: Express) => {
  const routes: Route[] = []

  for (const middleware of app._router.stack) {
    routes.push(...getMiddlewareRoutes(middleware))
  }

  return routes
}

const getRoutesPath = (path: string, method: string, routes: Route[], prefix = '') => {
  for (const route of routes) {
    if (route.prefix && route.subroutes) {
      if (route.prefix.test(path)) {
        return getRoutesPath(trimPrefix(path, route.path), method, route.subroutes, route.path)
      }
    } else if (route.regexp) {
      if (route.regexp.test(path) && route.methods?.[method]) {
        return `${prefix}${route.path}`
      }
    }
  }

  return NOT_FOUND
}

const normalizePath = (app: Express) => {
  const routes: Route[] = []

  return (path: string, { req }: { req: Request }) => {
    if (!routes.length) {
      routes.push(...getRoutes(app))
    }

    return getRoutesPath(path, req.method.toLowerCase(), routes)
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
