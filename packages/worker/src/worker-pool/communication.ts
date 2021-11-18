import { SerializedError } from 'src/typings'

export type OutgoingPayload<T extends OutgoingMessageType, I> = T extends 'start_task'
  ? {
      input: I
    }
  : {}

export type OutgoingMessageType = 'start_task'
export interface OutgoingMessage<T extends OutgoingMessageType, I> {
  type: T
  payload: OutgoingPayload<T, I>
}

export type Log = Partial<{ info: string; warning: string; error: string; debug: string }>
export type IncomingPayload<T extends IncomingMessageType, P> = T extends 'log'
  ? { log: Log }
  : T extends 'task_progress'
  ? { progress: number }
  : T extends 'task_error'
  ? { error: SerializedError }
  : T extends 'task_done'
  ? { output: P }
  : {}

export type IncomingMessageType = 'log' | 'worker_ready' | 'task_done' | 'task_progress' | 'task_error'

export interface IncomingMessage<T extends IncomingMessageType, P> {
  type: T
  payload: IncomingPayload<T, P>
}

export type AllOutgoingMessages<I> = OutgoingMessage<OutgoingMessageType, I>
export type AllIncomingMessages<O> = IncomingMessage<IncomingMessageType, O>

export const isStartTask = <I>(msg: AllOutgoingMessages<I>): msg is OutgoingMessage<'start_task', I> =>
  msg.type === 'start_task'

export const isLog = <O>(msg: AllIncomingMessages<O>): msg is IncomingMessage<'log', O> => msg.type === 'log'
export const isWorkerReady = <O>(msg: AllIncomingMessages<O>): msg is IncomingMessage<'worker_ready', O> =>
  msg.type === 'worker_ready'
export const isTrainingDone = <O>(msg: AllIncomingMessages<O>): msg is IncomingMessage<'task_done', O> =>
  msg.type === 'task_done'
export const isTrainingProgress = <O>(msg: AllIncomingMessages<O>): msg is IncomingMessage<'task_progress', O> =>
  msg.type === 'task_progress'
export const isTrainingError = <O>(msg: AllIncomingMessages<O>): msg is IncomingMessage<'task_error', O> =>
  msg.type === 'task_error'
