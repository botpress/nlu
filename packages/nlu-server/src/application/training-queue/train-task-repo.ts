import { TrainingId, TrainingRepository } from '../../infrastructure'
import { mapTaskQueryToTrainingQuery, mapTaskToTraining, mapTrainingToTask } from './train-task-mapper'
import { TrainTask, TrainTaskRepository } from './typings'

/** Maps target interface to actual training repository */
export class TrainTaskRepo implements TrainTaskRepository {
  constructor(private _trainRepo: TrainingRepository) {}
  public initialize = this._trainRepo.initialize.bind(this._trainRepo)
  public teardown = this._trainRepo.teardown.bind(this._trainRepo)
  public has = this._trainRepo.has.bind(this._trainRepo)

  public async get(taskId: TrainingId): Promise<TrainTask | undefined> {
    const training = await this._trainRepo.get(taskId)
    return training && mapTrainingToTask(training)
  }

  public async query(taskQuery: Partial<TrainTask>): Promise<TrainTask[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.query(trainQuery)
    return trainings.map(mapTrainingToTask)
  }

  public async queryOlderThan(taskQuery: Partial<TrainTask>, threshold: Date): Promise<TrainTask[]> {
    const trainQuery = mapTaskQueryToTrainingQuery(taskQuery)
    const trainings = await this._trainRepo.queryOlderThan(trainQuery, threshold)
    return trainings.map(mapTrainingToTask)
  }

  public async set(task: TrainTask): Promise<void> {
    const training = mapTaskToTraining(task)
    return this._trainRepo.set(training)
  }
}
