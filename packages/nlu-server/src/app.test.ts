import { createApp } from './api/app'
import { makeEngine } from './make-engine'
import { makeLogger } from '@botpress/logger'
import { StanOptions } from './config'
import request from 'supertest'
import { version } from 'moment'
import { buildWatcher } from './watcher'

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

const baseLogger = makeLogger()
let watcher

beforeEach(async () => {
  watcher = buildWatcher()
})

afterEach(() => {
  watcher.close()
})

test('GET /unknown-path', async () => {
  const engine = await makeEngine(options, baseLogger.sub('Launcher'))
  const app = await createApp(options, engine, version, watcher, baseLogger)

  await request(app).get('/unknown-path').expect(404)
})

test.each(['/info', '/v1/info'])('GET %s', async (path) => {
  const engine = await makeEngine(options, baseLogger)
  const app = await createApp(options, engine, version, watcher, baseLogger)

  await request(app).get(path).expect(200)
})

test('GET /models', async () => {
  const engine = await makeEngine(options, baseLogger)
  const app = await createApp(options, engine, version, watcher, baseLogger)

  await request(app).get('/models').expect(200, { success: true, models: [] })
})
