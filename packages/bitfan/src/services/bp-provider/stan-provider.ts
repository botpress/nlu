import { PredictOutput, TrainingState, TrainInput, Client } from '@botpress/nlu-client'
import { NLUError } from '@botpress/nlu-client/src/typings/http'
import _ from 'lodash'

import { sleep } from '../../utils'

const APP_ID = 'bitfan'
const POLLING_INTERVAL = 500

export class StanProvider {
  private _modelId: string | undefined
  private _client: Client

  constructor(nluServerEndpoint: string = 'http://localhost:3200') {
    this._client = new Client({ baseURL: nluServerEndpoint })
  }

  private async _getTrainingStatus(modelId: string): Promise<TrainingState> {
    const data = await this._client.getTrainingStatus(APP_ID, modelId)
    if (data.success) {
      return data.session
    }
    throw this._deserializeError(data.error)
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

    const data = await this._client.startTraining(APP_ID, {
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
    throw this._deserializeError(data.error)
  }

  public async predict(utterances: string[]): Promise<PredictOutput[]> {
    const predOutput = await this._client.predict(APP_ID, this._modelId ?? '', { utterances })
    if (!predOutput.success) {
      throw new Error(`An error occured at prediction: ${predOutput.error.message}.`)
    }
    return predOutput.predictions
  }

  private _deserializeError = (error: NLUError): Error => {
    const { message, stack } = error
    const err = new Error(message)
    err.stack = stack
    return err
  }
}
