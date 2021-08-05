import { PredictOutput, TrainingState, TrainInput, http, Client } from '@botpress/nlu-client'
import _ from 'lodash'

import { sleep } from '../../utils'

const CREDS: http.Credentials = { appId: '', appSecret: '' }
const POLLING_INTERVAL = 500

export class StanProvider {
  private _modelId: string | undefined
  private _client: Client

  constructor(nluServerEndpoint: string = 'http://localhost:3200', password = '') {
    this._client = new Client(nluServerEndpoint, password)
  }

  private async _getTrainingStatus(modelId: string): Promise<TrainingState> {
    const data = await this._client.getTrainingStatus(modelId, CREDS)
    if (data.success) {
      return data.session
    }
    throw new Error(data.error)
  }

  private async _waitForTraining(modelId: string, loggingCb?: (time: number, progress: number) => void) {
    let time = 0

    let session = await this._getTrainingStatus(modelId)
    while (session.status === 'training' || session.status === 'training-pending') {
      // TODO: add a max training time...
      await sleep(POLLING_INTERVAL)
      time += POLLING_INTERVAL
      loggingCb && loggingCb(time, session.progress)

      session = await this._getTrainingStatus(modelId)
    }

    if (session.status !== 'done') {
      throw new Error(`Training is done, but status is ${session.status}`)
    }
  }

  public async train(trainInput: TrainInput, loggingCb?: (time: number, progress: number) => void) {
    const contexts = _(trainInput.intents)
      .flatMap((i) => i.contexts)
      .uniq()
      .value()

    const data = await this._client.startTraining({
      ...CREDS,
      language: trainInput.language,
      contexts,
      intents: trainInput.intents,
      entities: trainInput.entities,
      seed: trainInput.seed
    })

    if (data.success) {
      const { modelId } = data
      this._modelId = modelId
      return this._waitForTraining(modelId, loggingCb)
    }
    throw new Error(data.error)
  }

  public async predict(texts: string[]): Promise<PredictOutput[]> {
    const predOutput = await this._client.predict(this._modelId ?? '', { utterances: texts, ...CREDS })
    if (!predOutput.success) {
      throw new Error('An error occured at prediction. The nature of the error is unknown.')
    }
    return predOutput.predictions
  }
}
