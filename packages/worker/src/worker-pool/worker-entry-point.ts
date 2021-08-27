import { serializeError } from '../error-utils'
import { Logger, TaskHandler, WorkerEntryPoint as IWorkerEntryPoint } from '../typings'
import { AllOutgoingMessages, IncomingMessage, isStartTask } from './communication'

export abstract class WorkerEntryPoint<I, O> implements IWorkerEntryPoint<I, O> {
  private _handlers: TaskHandler<I, O>[] = []

  abstract isMainWorker: () => boolean
  abstract messageMain: (msg: any) => void
  abstract listenMain: (event: 'message', l: (msg: any) => void) => void

  public async initialize() {
    if (this.isMainWorker()) {
      throw new Error("Can't create a worker entry point inside the main worker.")
    }

    const readyResponse: IncomingMessage<'worker_ready', O> = {
      type: 'worker_ready',
      payload: {}
    }
    this.messageMain(readyResponse)

    const messageHandler = async (msg: AllOutgoingMessages<I>) => {
      if (isStartTask(msg)) {
        for (const handler of this._handlers) {
          await this._runHandler(handler, msg.payload.input)
        }
      }
    }
    this.listenMain('message', messageHandler)
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
        this.messageMain(progressResponse)
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
      this.messageMain(doneResponse)
    } catch (err) {
      const errorResponse: IncomingMessage<'task_error', O> = {
        type: 'task_error',
        payload: {
          error: serializeError(err)
        }
      }
      this.messageMain(errorResponse)
    }
  }

  public logger: Logger = {
    debug: (msg: string) => {
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { debug: msg } }
      }
      this.messageMain(response)
    },
    info: (msg: string) => {
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { info: msg } }
      }
      this.messageMain(response)
    },
    warning: (msg: string, err?: Error) => {
      const warning = `${msg} ${serializeError(err)}`
      const response: IncomingMessage<'log', O> = {
        type: 'log',
        payload: { log: { warning } }
      }
      this.messageMain(response)
    },
    error: (msg: string, err?: Error) => {
      const error = `${msg} ${serializeError(err)}`
      const response: IncomingMessage<'log', O> = { type: 'log', payload: { log: { error } } }
      this.messageMain(response)
    },
    sub: (namespace: string) => {
      return this.logger // TODO: allow this
    }
  }
}
