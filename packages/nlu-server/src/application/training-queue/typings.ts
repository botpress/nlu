import { queues } from '@botpress/distributed'
import { TrainingError, TrainInput } from '@botpress/nlu-client'
import { TrainingId } from '../../infrastructure'

type TrainData = {
  trainingTime?: number
}

export type TrainTask = queues.Task<TrainingId, TrainInput, TrainData, TrainingError>
export type TerminatedTrainTask = queues.TerminatedTask<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskRunner = queues.TaskRunner<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskProgress = queues.ProgressCb<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskRepository = queues.TaskRepository<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskQueue = queues.TaskQueue<TrainingId, TrainInput, TrainData, TrainingError>
export type TrainTaskQueueOptions = queues.QueueOptions<TrainingId, TrainInput, TrainData, TrainingError>
