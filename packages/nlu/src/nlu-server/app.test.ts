import { createApp } from './app'
import { makeEngine } from './make-engine'
import Logger from '../utils/logger'
import { StanOptions } from './config'
import request from 'supertest'
import path from 'path'
import { version } from 'moment'
import { buildWatcher } from './watcher'
import createJWKSMock from 'mock-jwks'

const options: StanOptions = {
  host: 'localhost',
  port: 3200,
  limitWindow: '1m',
  limit: 1,
  bodySize: '',
  batchSize: 1,
  modelCacheSize: '',
  verbose: 1,
  doc: false,
  logFilter: [''],
  languageSources: [
    {
      endpoint: 'https://lang-01.botpress.io'
    }
  ],
  ducklingURL: 'https://duckling.botpress.io',
  ducklingEnabled: true,
  legacyElection: false,
  modelDir: 'testdir'
}

const jwks = createJWKSMock(process.env.JWKS_ORIGIN!)
const issuer = process.env.JWT_ISS
const jwksUri = process.env.JWKS_URI

const launcherLogger = Logger.sub('Launcher')
let watcher

beforeAll(() => {
  jwks.start()
})

afterAll(() => {
  jwks.stop()
})

beforeEach(async () => {
  process.PROJECT_LOCATION = process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
  watcher = buildWatcher()
})

afterEach(() => {
  watcher.close()
})

describe('Without JWKS', () => {
  test('GET /unknown-path', async () => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher)

    await request(app).get('/unknown-path').expect(404)
  })

  test.each(['/info', '/v1/info'])('GET %s', async (path) => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher)

    await request(app)
      .get(path)
      .expect(200, {
        success: true,
        info: {
          health: {
            isEnabled: true,
            validProvidersCount: 1,
            validLanguages: ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'nl', 'pl', 'pt', 'ru']
          },
          specs: { nluVersion: '2.2.0', languageServer: { dimensions: 300, domain: 'bp', version: '1.0.0' } },
          languages: ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'nl', 'pl', 'pt', 'ru'],
          version: '2.24.0'
        }
      })
  })

  test('GET /models', async () => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher)

    await request(app).get('/models').expect(200, { success: true, models: [] })
  })
})

describe('With JWKS', () => {
  test('GET /unknown-path', async () => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher, issuer, jwksUri)

    await request(app).get('/unknown-path').expect(404)
  })

  test.each(['/info', '/v1/info'])('GET %s', async (path) => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher, issuer, jwksUri)

    await request(app)
      .get(path)
      .expect(200, {
        success: true,
        info: {
          health: {
            isEnabled: true,
            validProvidersCount: 1,
            validLanguages: ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'nl', 'pl', 'pt', 'ru']
          },
          specs: { nluVersion: '2.2.0', languageServer: { dimensions: 300, domain: 'bp', version: '1.0.0' } },
          languages: ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'nl', 'pl', 'pt', 'ru'],
          version: '2.24.0'
        }
      })
  })

  test('GET /models w/o token', async () => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher, issuer, jwksUri)

    await request(app).get('/models').expect(401)
  })

  test('GET /models w/ token', async () => {
    const engine = await makeEngine(options, launcherLogger)
    const app = await createApp(options, engine, version, watcher, issuer, jwksUri)
    const token = jwks.token({
      iss: process.env.JWT_ISS
    })

    await request(app).get('/models').set('Authorization', `Bearer ${token}`).expect(200, { success: true, models: [] })
  })
})
