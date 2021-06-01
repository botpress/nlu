import { createApp } from './app'
import { makeEngine } from './engine'
import Logger from '../utils/logger'
import { StanOptions } from './config'
import request from 'supertest'
import path from 'path'

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

let app

// beforeAll(async () => {
//   const launcherLogger = Logger.sub('Launcher')
//   console.log('PROJECT_LOCATION:')
//   process.PROJECT_LOCATION = process.pkg
//     ? path.dirname(process.execPath) // We point at the binary path
//     : __dirname // e.g. /dist/..
//   console.log(process.PROJECT_LOCATION)
//   const engine = await makeEngine(options, launcherLogger)
//   app = await createApp(options, engine, '1.0')
// })

test('spg test', async () => {
  // arrange
  // console.log(app)
  // assert
  console.log('here')
  expect(1).toBe(1)
  // await request(app).get('/info').expect(200)
})
