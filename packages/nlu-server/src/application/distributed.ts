import { Logger } from '@botpress/logger'
import { http } from '@botpress/nlu-client'
import { Engine, ModelId } from '@botpress/nlu-engine'
import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingRepository } from '../infrastructure/training-repo/typings'
import { Broadcaster } from '../utils/broadcast'
import { Application } from '.'
import TrainingQueue from './training-queue'

export class DistributedApp extends Application {
  public cancelTraining!: (modelId: ModelId, credentials: http.Credentials) => Promise<void>

  constructor(
    _modelRepo: ModelRepository,
    _trainingRepo: TrainingRepository,
    _trainService: TrainingQueue,
    _engine: Engine,
    _serverVersion: string,
    baseLogger: Logger,
    private _broadcaster: Broadcaster<[ModelId, http.Credentials]>
  ) {
    super(_modelRepo, _trainingRepo, _trainService, _engine, _serverVersion, baseLogger)
  }

  public async initialize() {
    await super.initialize()
    this.cancelTraining = await this._broadcaster.broadcast({
      name: 'cancel_training',
      run: super.cancelTraining.bind(this)
    })
  }
}
