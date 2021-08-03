import { createAPI } from './api'
import { makeLogger } from '@botpress/logger'
import request from 'supertest'
import { version } from 'moment'
import { makeApplication } from './bootstrap/make-application'
import { NLUServerOptions } from './bootstrap/config'
import { buildWatcher } from './bootstrap/watcher'

const options: NLUServerOptions = {
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

const baseLogger = makeLogger()
let watcher

beforeEach(async () => {
  watcher = buildWatcher()
})

afterEach(() => {
  watcher.close()
})

test('GET /unknown-path', async () => {
  const app = await makeApplication(options, version, baseLogger, watcher)
  const expressApp = await createAPI(options, app, baseLogger)

  await request(expressApp).get('/unknown-path').expect(404)
})

test.each(['/info', '/v1/info'])('GET %s', async (path) => {
  const app = await makeApplication(options, version, baseLogger, watcher)
  const expressApp = await createAPI(options, app, baseLogger)

  await request(expressApp).get(path).expect(200)
})

test('GET /models', async () => {
  const app = await makeApplication(options, version, baseLogger, watcher)
  const expressApp = await createAPI(options, app, baseLogger)

  await request(expressApp).get('/models').expect(200, { success: true, models: [] })
})
