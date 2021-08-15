import { Logger } from '@botpress/logger'
import { http } from '@botpress/nlu-client'
import { Engine, ModelId } from '@botpress/nlu-engine'
import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingRepository } from '../infrastructure/training-repo/typings'
import { Broadcaster } from '../utils/broadcast'
import TrainingQueue from './training-queue'

export class DistributedTrainingQueue extends TrainingQueue {
  private _broadcastCancelTraining!: (modelId: ModelId, credentials: http.Credentials) => Promise<void>
  private _broadcastRunTask!: () => Promise<void>

  constructor(
    logger: Logger,
    engine: Engine,
    modelRepo: ModelRepository,
    trainingRepo: TrainingRepository,
    clusterId: string,
    private _broadcaster: Broadcaster
  ) {
    super(logger, engine, modelRepo, trainingRepo, clusterId)
  }

  public async initialize() {
    await super.initialize()

    this._broadcastCancelTraining = await this._broadcaster.broadcast<[ModelId, http.Credentials]>({
      name: 'cancel_training',
      run: super.cancelTraining.bind(this)
    })

    this._broadcastRunTask = await this._broadcaster.broadcast<[]>({
      name: 'run_task',
      run: super.runTask.bind(this)
    })
  }

  // for if a different instance gets the cancel training http call
  public cancelTraining(modelId: ModelId, credentials: http.Credentials) {
    return this._broadcastCancelTraining(modelId, credentials)
  }

  // for if an completly busy instance receives a queue training http call
  protected runTask() {
    return this._broadcastRunTask()
  }
}
