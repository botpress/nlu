import { createAPI } from './api'
import { makeLogger } from '@botpress/logger'
import request from 'supertest'
import { version } from 'moment'
import { makeApplication } from './bootstrap/make-application'
import { NLUServerOptions } from './bootstrap/config'
import { buildWatcher } from './bootstrap/watcher'
import { Application } from './application'

const options: NLUServerOptions = {
  host: 'localhost',
  port: 3200,
  limitWindow: '1m',
  limit: 0,
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
  modelDir: 'testdir',
  maxTraining: 2
}

const baseLogger = makeLogger()
let watcher
let app: Application

beforeEach(async () => {
  watcher = buildWatcher()
  app = await makeApplication(options, version, baseLogger, watcher)
})

afterEach(async () => {
  watcher.close()
  await app.teardown()
})

test('GET /unknown-path', async () => {
  const expressApp = await createAPI(options, app, baseLogger)
  await request(expressApp).get('/unknown-path').expect(404)
})

test.each(['/info', '/v1/info'])('GET %s', async (path) => {
  const expressApp = await createAPI(options, app, baseLogger)
  await request(expressApp).get(path).expect(200)
})

test('GET /models', async () => {
  const expressApp = await createAPI(options, app, baseLogger)
  await request(expressApp).get('/models').set('X-App-Id', 'my-app').expect(200, { success: true, models: [] })
})
