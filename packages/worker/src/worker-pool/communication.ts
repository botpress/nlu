import { SerializedError } from 'src/typings'

export type OutgoingPayload<T extends OutgoingMessageType, I> = T extends 'start_task'
  ? {
      input: I
    }
  : {}

export type OutgoingMessageType = 'start_task'
export type OutgoingMessage<T extends OutgoingMessageType, I> = {
  type: T
  payload: OutgoingPayload<T, I>
}

export type Log = Partial<{ info: string; warning: string; error: string; debug: string }>
export type IncomingPayload<T extends IncomingMessageType, O, P = void> = T extends 'log'
  ? { log: Log }
  : T extends 'task_progress'
  ? { progress: number; data: P }
  : T extends 'task_error'
  ? { error: SerializedError }
  : T extends 'task_done'
  ? { output: O }
  : {}

export type IncomingMessageType = 'log' | 'worker_ready' | 'task_done' | 'task_progress' | 'task_error'

export type IncomingMessage<T extends IncomingMessageType, O, P = void> = {
  type: T
  payload: IncomingPayload<T, O, P>
}

export type AllOutgoingMessages<I> = OutgoingMessage<OutgoingMessageType, I>
export type AllIncomingMessages<O, P = void> = IncomingMessage<IncomingMessageType, O, P>

export const isStartTask = <I>(msg: AllOutgoingMessages<I>): msg is OutgoingMessage<'start_task', I> =>
  msg.type === 'start_task'

export const isLog = <O, P = void>(msg: AllIncomingMessages<O, P>): msg is IncomingMessage<'log', O, P> =>
  msg.type === 'log'
export const isWorkerReady = <O, P = void>(
  msg: AllIncomingMessages<O, P>
): msg is IncomingMessage<'worker_ready', O, P> => msg.type === 'worker_ready'
export const isTrainingDone = <O, P = void>(
  msg: AllIncomingMessages<O, P>
): msg is IncomingMessage<'task_done', O, P> => msg.type === 'task_done'
export const isTrainingProgress = <O, P = void>(
  msg: AllIncomingMessages<O, P>
): msg is IncomingMessage<'task_progress', O, P> => msg.type === 'task_progress'
export const isTrainingError = <O, P = void>(
  msg: AllIncomingMessages<O, P>
): msg is IncomingMessage<'task_error', O, P> => msg.type === 'task_error'
