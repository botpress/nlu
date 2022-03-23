import _ from 'lodash'
import { Logger } from '../typings'
import { Worker } from './worker'

interface Options {
  maxItems: number
}

type Generator = () => Promise<Worker>

type ItemCallback = (item: Worker) => void

export class Scheduler {
  private ready: Worker[] = []
  private active: { [id: string]: Worker } = {}
  private waiting: ItemCallback[] = []

  constructor(private _generator: Generator, private logger: Logger, private _options: Options) {}

  public async getNext(id: string): Promise<Worker> {
    this.ready = this._filterOutDeadWorkers(this.ready)

    const readyCount = this.ready.length
    const activeCount = Object.values(this.active).length
    const totalCount = readyCount + activeCount

    if (readyCount) {
      const nextItem = this.ready.pop()!
      this.active[id] = nextItem
      return nextItem
    }

    const isPlaceLeft = this._options.maxItems < 0 || this._options.maxItems > totalCount
    if (!readyCount && isPlaceLeft) {
      const newItem = await this._generator()
      this.active[id] = newItem
      return newItem
    }

    return new Promise((resolve) => {
      this.waiting.push((item: Worker) => {
        this.active[id] = item
        resolve(item)
      })
    })
  }

  private _filterOutDeadWorkers = (workers: Worker[]): Worker[] => {
    const [alive, dead] = _.partition(workers, (w) => w.isAlive())
    if (dead.length) {
      const formattedDeads = dead.map((w) => w.wid).join(', ')
      this.logger.warning(`The following workers have died since last usage: [${formattedDeads}]`)
    }
    return alive
  }

  public cancel(id: string): void {
    const item = this.active[id]
    if (!item) {
      return
    }

    item.cancel()

    delete this.active[id]
  }

  public isActive(id: string) {
    return !!this.active[id]
  }

  public releaseItem(id: string, item: Worker) {
    delete this.active[id]

    if (!this.waiting.length) {
      this.ready.push(item)
      return
    }

    const next = this.waiting.pop()!
    next(item)
  }
}
