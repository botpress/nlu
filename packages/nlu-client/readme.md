# Botpress NLU Client

NodeJS SDK for the Botpress NLU Server written in TypeScript.

## Usage

### basic usage

```ts
import { Logger } from '@botpress/logger'
import { Client } from '@botpress/nlu-client'
import fs from 'fs'
import path from 'path'

const appId = 'myapp'
const baseURL = 'http://localhost:3200'
const client = new Client({ baseURL })
const trainsetLocation = path.join(__dirname, 'my-trainset.json')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const main = async () => {
  // 0. test you connection
  const infoRes = await client.getInfo()
  if (infoRes.success === false) {
    throw new Error(`getInfo failed: ${infoRes.error.message}`)
  }
  console.log(`Using nlu server version v${infoRes.info.version}`)

  // 1. start a training
  const rawTrainset = await fs.promises.readFile(trainsetLocation, 'utf8')
  const parsedTrainset = JSON.parse(rawTrainset)
  const trainRes = await client.startTraining(appId, parsedTrainset)
  if (trainRes.success === false) {
    throw new Error(`startTraining failed: ${trainRes.error.message}`)
  }
  const { modelId } = trainRes

  // 2. wait for training to be done
  const fetchStatus = async () => {
    const statusRes = await client.getTrainingStatus(appId, modelId)
    if (statusRes.success === false) {
      throw new Error(`getTrainingStatus failed: ${statusRes.error.message}`)
    }
    return statusRes.session
  }

  let session = await fetchStatus()
  while (session.status === 'training' || session.status === 'training-pending') {
    console.log(`training progress: ${session.progress}`)
    await sleep(100)
    session = await fetchStatus()
  }

  if (session.status === 'canceled') {
    throw new Error('training was canceled')
  }
  if (session.status === 'errored') {
    const errorMsg = session.error?.message || ''
    throw new Error(`training failed with error: ${errorMsg}`)
  }

  console.log('training done.')

  // 3. predict
  const predictRes = await client.predict(appId, modelId, { utterances: ['this grape seems to be moldy'] })
  if (predictRes.success === false) {
    throw new Error(`getTrainingStatus failed: ${predictRes.error.message}`)
  }

  console.log(predictRes.predictions[0])
  console.log('Done.')
}

void main()
```

### model weights upload and download

The `/modelweights` ressource has a slightly different behavior than the rest of the API. It communicates with binary buffers instead of JSON.

```ts
import { Client } from '@botpress/nlu-client'
import fs from 'fs'
import path from 'path'

const appId = 'myapp'
const modelId = '5c1257bb8827ad31.778ab15ae330044f.42.en'

const modelPath = path.join(__dirname, 'downloaded.model')
const baseURL = 'http://localhost:3200'
const client = new Client({ baseURL })

const main = async () => {
  // downloading a model
  const downloadRes = await client.modelWeights.download(appId, modelId, { responseType: 'stream' })
  if (downloadRes.status !== 'OK') {
    throw new Error(`Download weights received status ${downloadRes.status}`)
  }

  // wait for download to be complete
  await new Promise<void>((resolve, reject) => {
    downloadRes.weights.on('end', resolve)
    downloadRes.weights.on('error', reject)
    downloadRes.weights.pipe(fs.createWriteStream(modelPath))
  })

  // uploading a model
  const modelWeights = await fs.promises.readFile(modelPath)
  const uploadRes = await client.modelWeights.upload(appId, modelWeights)
  if (uploadRes.status !== 'OK') {
    throw new Error(`Upload weights received status ${uploadRes.status}`)
  }

  console.log('Done.')
}

void main()
```
