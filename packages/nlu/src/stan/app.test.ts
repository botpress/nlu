import { createApp } from './app'
import { makeEngine } from './engine'
import Logger from '../utils/logger'
import { StanOptions } from './config'
import request from 'supertest'
import path from 'path'
import { version } from 'moment'
import { buildWatcher } from './watcher'
import util from 'util'

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
  modelDir: 'hello'
}

test('GET /info', async () => {
  const launcherLogger = Logger.sub('Launcher')
  process.PROJECT_LOCATION = process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
  const engine = await makeEngine(options, launcherLogger)

  const watcher = buildWatcher()

  const app = await createApp(options, engine, version, watcher)
  await request(app)
    .get('/info')
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

  watcher.close()
})

test('GET /models without auth', async () => {
  const launcherLogger = Logger.sub('Launcher')
  process.PROJECT_LOCATION = process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
  const engine = await makeEngine(options, launcherLogger)

  const watcher = buildWatcher()

  const app = await createApp(options, engine, version, watcher)
  await request(app).get('/models').expect(200, { success: true, models: [] })

  watcher.close()
})
