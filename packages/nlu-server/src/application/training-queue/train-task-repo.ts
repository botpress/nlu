import { queues } from '@botpress/distributed'
import { TrainInput } from '@botpress/nlu-client'
import { TrainingRepository } from '../../infrastructure'
import {
  mapTaskIdToTrainId,
  mapTaskQueryToTrainingQuery,
  mapTaskToTraining,
  mapTrainingToTask
} from './train-task-mapper'
import { TrainData } from './typings'

/** Maps target interface to actual training repository */
export class TrainTaskRepo implements queues.TaskRepository<TrainInput, TrainData> {
  constructor(private _trainRepo: TrainingRepository) {}
  public initialize = this._trainRepo.initialize
  public teardown = this._trainRepo.teardown

  public async get(taskId: string): Promise<queues.Task<TrainInput, TrainData> | undefined> {
    const trainId = mapTaskIdToTrainId(taskId)
    const training = await this._trainRepo.get(trainId)
    return training && mapTrainingToTask(training)
  }

  public async has(taskId: string): Promise<boolean> {
    const trainId = mapTaskIdToTrainId(taskId)
    return this._trainRepo.has(trainId)
  }

  public async query(taskQuery: Partial<queues.TaskState>): Promise<queues.Task<TrainInput, TrainData>[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.query(trainQuery)
    return trainings.map(mapTrainingToTask)
  }

  public async queryOlderThan(
    taskQuery: Partial<queues.TaskState>,
    threshold: Date
  ): Promise<queues.Task<TrainInput, TrainData>[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.queryOlderThan(trainQuery, threshold)
    return trainings.map(mapTrainingToTask)
  }

  public async set(task: queues.Task<TrainInput, TrainData>): Promise<void> {
    const training = mapTaskToTraining(task)
    return this._trainRepo.set(training)
  }
}
