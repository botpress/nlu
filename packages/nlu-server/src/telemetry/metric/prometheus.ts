import { createMiddleware, defaultNormalizers } from '@promster/express'
import { getSummary, getContentType } from '@promster/metrics'
import { Application as ExpressApp, Request, Response } from 'express'
import * as http from 'http'

const NOT_FOUND = 'not_found'

const trimPrefix = (value: string, prefix: string) => (value.startsWith(prefix) ? value.slice(prefix.length) : value)

// Disable naming convention because fast_slash comes from Express.
// eslint-disable-next-line @typescript-eslint/naming-convention
// Source: https://github.com/thenativeweb/get-routes/blob/main/lib/getRoutes.ts
const regexToString = (path: { fast_slash: any; toString: () => string }): string => {
  if (path.fast_slash) {
    return ''
  }

  // eslint-disable-next-line prefer-named-capture-group
  const match = /^\/\^((?:\\[$()*+./?[\\\]^{|}]|[^$()*+./?[\\\]^{|}])*)\$\//u.exec(
    path.toString().replace('\\/?', '').replace('(?=\\/|$)', '$')
  )

  if (match) {
    // Unescape characters.
    // eslint-disable-next-line prefer-named-capture-group
    return match[1].replace(/\\(.)/gu, '$1')
  }

  return '[Unknown path]'
}

const processMiddleware = (path: string, req: Request, middleware: any, prefix = '') => {
  if (middleware.name === 'router' && middleware.handle.stack) {
    for (const subMiddleware of middleware.handle.stack) {
      if (middleware.regexp?.test(path)) {
        const match = processMiddleware(
          trimPrefix(path, middleware.path),
          req,
          subMiddleware,
          `${prefix}${middleware.path}`
        )

        if (match) {
          return match
        }
      }
    }
  }

  if (!middleware.route?.methods?.[req.method.toLowerCase()]) {
    return
  }

  if (middleware.regexp?.test(path)) {
    return `${prefix}${regexToString(middleware.regexp)}`
  }
}

const normalizePath = (app: ExpressApp, path: string, { req, res }: { req: Request; res: Response }) => {
  for (const middleware of app._router.stack) {
    const match = processMiddleware(path, req, middleware)

    if (match) {
      return match
    }
  }

  return NOT_FOUND
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

export const initPrometheus = async (app: ExpressApp, onRequest?: () => Promise<void>) => {
  app.use(
    createMiddleware({
      app,
      options: {
        ...defaultNormalizers,
        normalizePath: normalizePath.bind(undefined, app),
        buckets: [0.05, 0.1, 0.5, 1, 3]
      }
    })
  )

  await createServer(onRequest)
}
