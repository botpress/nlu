import { createApp } from './app'
import { makeEngine } from './engine'
import Logger from '../utils/logger'
import { StanOptions } from './config'

const options: StanOptions = {
  host: 'localhost',
  port: 3200,
  limitWindow: '',
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
  legacyElection: false
}

let app

beforeAll(async () => {
  const launcherLogger = Logger.sub('Launcher')
  const engine = await makeEngine(options, launcherLogger)
  app = createApp(options, engine, '1.0')
})

test('spg test', () => {
  // arrange

  // assert
  expect(1).toBe(1)
})
