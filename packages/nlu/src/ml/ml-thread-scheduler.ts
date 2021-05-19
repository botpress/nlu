import _ from 'lodash'
import path from 'path'
import { Worker, WorkerOptions } from 'worker_threads'

const WORKER_ENTRY_POINT = path.resolve(__dirname, './ml-thread-index.js')

// TODO: if thread B, started after thread A but done faster, it should be returned next by BaseScheduler
export class BaseScheduler<T> {
  private elements: { el: T; turns: number }[] = []

  // TODO: still not quite sure if we want the threads to be lazy created... Logic could be even simpler if not.
  constructor(private maxElements: number, private elementGenerator: () => Promise<T>) {}

  async getNext(): Promise<T> {
    this.elements.forEach((el) => el.turns++)

    if (this.elements.length < this.maxElements) {
      const el = await this.elementGenerator()
      this.elements.push({ el, turns: 0 })
      return el
    }

    const lru = _.maxBy(this.elements, (el) => el.turns)!
    lru.turns = 0
    return lru.el
  }
}

export class MLThreadScheduler extends BaseScheduler<Worker> {
  constructor(maxElements: number) {
    super(maxElements, makeWorker)
  }
}

async function makeWorker() {
  const clean = (data: NodeJS.ProcessEnv) => _.omitBy(data, (val) => val === null || typeof val === 'object')
  return new Worker(WORKER_ENTRY_POINT, {
    workerData: {
      processData: {},
      processEnv: clean(process.env)
    },
    env: { ...process.env }
  } as WorkerOptions)
}
