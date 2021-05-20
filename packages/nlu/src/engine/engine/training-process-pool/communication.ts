import { ErrorMessage } from '../../../utils/error-utils'

import { TrainInput, TrainOutput } from '../training-pipeline'

export type OutgoingPayload<T extends OutgoingMessageType> = T extends 'start_training' ? { input: TrainInput } : {}

export type OutgoingMessageType = 'start_training'
export interface OutgoingMessage<T extends OutgoingMessageType> {
  type: T
  payload: OutgoingPayload<T>
}

export type Log = Partial<{ info: string; warning: string; error: string; debug: string }>
export type IncomingPayload<T extends IncomingMessageType> = T extends 'log'
  ? { log: Log; requestId: string }
  : T extends 'worker_ready'
  ? { requestId: string }
  : T extends 'training_done'
  ? { output: TrainOutput }
  : T extends 'training_progress'
  ? { progress: number }
  : T extends 'training_error'
  ? { error: ErrorMessage }
  : {}

export type IncomingMessageType = 'log' | 'worker_ready' | 'training_done' | 'training_progress' | 'training_error'

export interface IncomingMessage<T extends IncomingMessageType> {
  type: T
  payload: IncomingPayload<T>
  srcPID: number
}

export type AllOutgoingMessages = OutgoingMessage<OutgoingMessageType>
export type AllIncomingMessages = IncomingMessage<IncomingMessageType>

export const isStartTraining = (msg: AllOutgoingMessages): msg is OutgoingMessage<'start_training'> =>
  msg.type === 'start_training'

export const isLog = (msg: AllIncomingMessages): msg is IncomingMessage<'log'> => msg.type === 'log'
export const isWorkerReady = (msg: AllIncomingMessages): msg is IncomingMessage<'worker_ready'> =>
  msg.type === 'worker_ready'
export const isTrainingDone = (msg: AllIncomingMessages): msg is IncomingMessage<'training_done'> =>
  msg.type === 'training_done'
export const isTrainingProgress = (msg: AllIncomingMessages): msg is IncomingMessage<'training_progress'> =>
  msg.type === 'training_progress'
export const isTrainingError = (msg: AllIncomingMessages): msg is IncomingMessage<'training_error'> =>
  msg.type === 'training_error'
