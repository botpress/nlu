import { SmallLogger } from 'src/typings'
import { serializeError } from '../error-utils'
import { AllOutgoingMessages, IncomingMessage, isStartTask } from './communication'

export interface TaskDefinition<I> {
  input: I
  logger: SmallLogger // TODO use the actual logger implementation with a custom LogTransporter
  progress: (p: number) => void
}

export type TaskHandler<I, O> = (def: TaskDefinition<I>) => Promise<O>

export class TaskEntry<I = {}, O = {}> {
  private _handlers: TaskHandler<I, O>[] = []

  // TODO: make sure you're in child process or throw
  public async initialize() {
    const readyResponse: IncomingMessage<'worker_ready', O> = {
      type: 'worker_ready',
      payload: {}
    }
    process.send!(readyResponse)

    const messageHandler = async (msg: AllOutgoingMessages<I>) => {
      if (isStartTask(msg)) {
        for (const handler of this._handlers) {
          await this._runHandler(handler, msg.payload.input)
        }
      }
    }
    process.on('message', messageHandler)
  }

  public listenForTask(handler: TaskHandler<I, O>) {
    this._handlers.push(handler)
  }

  private _runHandler = async (handler: TaskHandler<I, O>, input: I) => {
    try {
      const progress = (p: number) => {
        const progressResponse: IncomingMessage<'task_progress', O> = {
          type: 'task_progress',
          payload: { progress: p }
        }
        process.send!(progressResponse)
      }

      const output: O = await handler({
        input,
        logger: this.logger,
        progress
      })

      const doneResponse: IncomingMessage<'task_done', O> = {
        type: 'task_done',
        payload: {
          output
        }
      }
      process.send!(doneResponse)
    } catch (err) {
      const errorResponse: IncomingMessage<'task_error', O> = {
        type: 'task_error',
        payload: {
          error: serializeError(err)
        }
      }
      process.send!(errorResponse)
    }
  }

  public logger: SmallLogger = {
    debug: (msg: string) => {
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { debug: msg } }
      }
      process.send!(response)
    },
    info: (msg: string) => {
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { info: msg } }
      }
      process.send!(response)
    },
    warning: (msg: string, err?: Error) => {
      const warning = `${msg} ${serializeError(err)}`
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { warning } }
      }
      process.send!(response)
    },
    error: (msg: string, err?: Error) => {
      const error = `${msg} ${serializeError(err)}`
      const response: IncomingMessage<'log', O> = { type: 'log', payload: { log: { error } } }
      process.send!(response)
    }
  }
}
