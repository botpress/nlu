import Bluebird from 'bluebird'
import { EventEmitter2 } from 'eventemitter2'
import PGPubSub from 'pg-pubsub'

const CHANNELS = ['cancel_task', 'run_scheduler_interrupt', 'cancel_task_done'] as const
type Channel = typeof CHANNELS[number]

type CancelTaskError = {
  message: string
  stack?: string
}

type PGQueueEventData<TId, C extends Channel> = C extends 'run_scheduler_interrupt'
  ? void
  : C extends 'cancel_task'
  ? { taskId: TId; clusterId: string }
  : C extends 'cancel_task_done'
  ? { taskId: TId; err?: CancelTaskError }
  : never

export class PGQueueEventObserver<TId, TInput, TData, TError> {
  constructor(private _pubsub: PGPubSub, private _queueId: string) {}

  private _evEmitter = new EventEmitter2()

  public initialize = async (): Promise<void> => {
    await Bluebird.map(CHANNELS, (c: Channel) =>
      this._pubsub.addChannel(this._pgChannelId(c), (x) => this._evEmitter.emit(c, x))
    )
  }

  public teardown = async (): Promise<void> => {
    await Bluebird.map(CHANNELS, (c: Channel) => this._pubsub.removeChannel(this._pgChannelId(c)))
  }

  public on<C extends Channel>(c: C, handler: (data: PGQueueEventData<TId, C>) => Promise<void>): void {
    this._evEmitter.on(c, handler)
  }

  public off<C extends Channel>(c: C, handler: (data: PGQueueEventData<TId, C>) => Promise<void>): void {
    this._evEmitter.off(c, handler)
  }

  public onceOrMore<C extends Channel>(
    c: C,
    handler: (data: PGQueueEventData<TId, C>) => Promise<'stay' | 'leave'>
  ): void {
    const cb = async (x: PGQueueEventData<TId, C>) => {
      const y = await handler(x)
      if (y === 'leave') {
        this._evEmitter.off(c, cb)
      }
    }
    this._evEmitter.on(c, cb)
  }

  public async emit<C extends Channel>(c: C, data: PGQueueEventData<TId, C>): Promise<void> {
    return this._pubsub.publish(this._pgChannelId(c), data)
  }

  private _pgChannelId = (c: Channel) => `${this._queueId}:${c}`
}
