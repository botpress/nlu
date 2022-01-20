import * as q from '@botpress/distributed'
import { TrainingError, TrainInput } from '@botpress/nlu-client'
import { TrainingId } from '../../infrastructure'

type TrainData = {
  trainingTime?: number
}

export type TrainTask = q.Task<TrainingId, TrainInput, TrainData, TrainingError>
export type TerminatedTrainTask = q.TerminatedTask<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskRunner = q.TaskRunner<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskProgress = q.ProgressCb<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskRepository = q.TaskRepository<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskQueue = q.TaskQueue<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskQueueOptions = q.QueueOptions<TrainingId, TrainInput, TrainData, TrainingError>
