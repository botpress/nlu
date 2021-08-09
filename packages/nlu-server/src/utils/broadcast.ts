import PGPubSub from 'pg-pubsub'

type Func<X extends any[], Y extends any> = (...x: X) => Y

interface Task<X extends any[]> {
  name: string
  run: Func<X, Promise<void>>
}

export interface Broadcaster<X extends any[]> {
  broadcast(t: Task<X>): Promise<Func<X, Promise<void>>>
}

export class DBBroadcaster<X extends any[]> implements Broadcaster<X> {
  public constructor(private _pubsub: PGPubSub) {}

  public async broadcast(t: Task<X>): Promise<Func<X, Promise<void>>> {
    await this._pubsub.addChannel(t.name, (x) => t.run(...x))

    return (...x: X) => {
      return this._pubsub.publish(t.name, x)
    }
  }
}

export class InMemoryBroadcaster<X extends any[]> implements Broadcaster<X> {
  public async broadcast(t: Task<X>): Promise<Func<X, Promise<void>>> {
    return t.run
  }
}
