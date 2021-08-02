import { createApp } from './app'
import { makeEngine } from './make-engine'
import { Logger } from '@botpress/nlu-logger'
import { StanOptions } from './config'
import request from 'supertest'
import { version } from 'moment'
import { buildWatcher } from './watcher'
import { setProjectLocation } from './project'

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

const launcherLogger = Logger.sub('Launcher')
let watcher

beforeEach(async () => {
  setProjectLocation()
  watcher = buildWatcher()
})

afterEach(() => {
  watcher.close()
})

test('GET /unknown-path', async () => {
  const engine = await makeEngine(options, launcherLogger)
  const app = await createApp(options, engine, version, watcher)

  await request(app).get('/unknown-path').expect(404)
})

test.each(['/info', '/v1/info'])('GET %s', async (path) => {
  const engine = await makeEngine(options, launcherLogger)
  const app = await createApp(options, engine, version, watcher)

  await request(app).get(path).expect(200)
})

test('GET /models', async () => {
  const engine = await makeEngine(options, launcherLogger)
  const app = await createApp(options, engine, version, watcher)

  await request(app).get('/models').expect(200, { success: true, models: [] })
})
