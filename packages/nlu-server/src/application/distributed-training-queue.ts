import { Logger } from '@botpress/logger'
import { http } from '@botpress/nlu-client'
import { Engine, ModelId } from '@botpress/nlu-engine'
import { ModelRepository } from '../infrastructure/model-repo'
import { TrainingRepository } from '../infrastructure/training-repo/typings'
import { Broadcaster } from '../utils/broadcast'
import TrainingQueue, { QueueOptions } from './training-queue'

export class DistributedTrainingQueue extends TrainingQueue {
  private _broadcastCancelTraining!: TrainingQueue['cancelTraining']
  private _broadcastRunTask!: () => Promise<void>

  constructor(
    engine: Engine,
    modelRepo: ModelRepository,
    trainingRepo: TrainingRepository,
    clusterId: string,
    logger: Logger,
    private _broadcaster: Broadcaster,
    opt?: Partial<QueueOptions>
  ) {
    super(engine, modelRepo, trainingRepo, clusterId, logger, opt)
  }

  public async initialize() {
    await super.initialize()

    this._broadcastCancelTraining = await this._broadcaster.broadcast<[string, ModelId]>({
      name: 'cancel_training',
      run: super.cancelTraining.bind(this)
    })

    this._broadcastRunTask = await this._broadcaster.broadcast<[]>({
      name: 'run_task',
      run: super.runTask.bind(this)
    })
  }

  // for if a different instance gets the cancel training http call
  public cancelTraining(appId: string, modelId: ModelId) {
    return this._broadcastCancelTraining(appId, modelId)
  }

  // for if an completly busy instance receives a queue training http call
  protected runTask() {
    return this._broadcastRunTask()
  }
}
