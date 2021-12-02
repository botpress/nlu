import PGPubSub from 'pg-pubsub'

type Func<X extends any[], Y extends any> = (...x: X) => Y

type Task<X extends any[]> = {
  name: string
  run: Func<X, Promise<void>>
}

export class Broadcaster {
  constructor(private _pubsub: PGPubSub) {}

  public async broadcast<X extends any[]>(t: Task<X>): Promise<Func<X, Promise<void>>> {
    await this._pubsub.addChannel(t.name, (x) => t.run(...x))

    return (...x: X) => {
      return this._pubsub.publish(t.name, x)
    }
  }
}
