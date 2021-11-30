import { makeClassifier, makeQuery, Options, Query } from '@botpress/node-fasttext'
import Bluebird from 'bluebird'
import { VError } from 'verror'
import { MLToolkit } from '../typings'

const FAST_TEXT_VERBOSITY = parseInt(process.env.FAST_TEXT_VERBOSITY || '0')
const FAST_TEXT_CLEANUP_MS = parseInt(process.env.FAST_TEXT_CLEANUP_MS || '60000') // 60s caching by default

export const DefaultTrainArgs: Partial<MLToolkit.FastText.TrainArgs> = {
  bucket: 25000,
  dim: 15,
  epoch: 5,
  loss: 'hs',
  lr: 0.05,
  minn: 3,
  maxn: 6,
  minCount: 1,
  wordNgrams: 3
}

/** A wrapper class around the fasttext node bindings.
 * This wrapper adds support for lazy loading of the models, which
 * allows to delay the loading of the model only when actually needed for prediction or query.
 * It also cleans up the model after 'x' ms of inactivity to free up memory.
 */
export class FastTextModel implements MLToolkit.FastText.Model {
  private _modelPromise: Promise<any> | undefined
  private _queryPromise: Promise<any> | undefined
  private _modelTimeout: NodeJS.Timeout | undefined
  private _queryTimeout: NodeJS.Timeout | undefined
  private _modelPath: string | undefined

  private get modelPath(): string {
    if (!this._modelPath) {
      throw new Error('Model path not set')
    }

    if (this._modelPath.endsWith('.ftz') || this._modelPath.endsWith('.bin')) {
      return this._modelPath
    }

    return this._modelPath + '.bin'
  }

  constructor(private lazy: boolean = true, private keepInMemory = false, private queryOnly = false) {}

  public cleanup() {
    this._modelPromise = undefined
    this._queryPromise = undefined
  }

  public async trainToFile(
    method: MLToolkit.FastText.TrainCommand,
    modelPath: string,
    args: Partial<MLToolkit.FastText.TrainArgs>
  ): Promise<void> {
    const outPath = this._cleanPath(modelPath)
    const model = await makeClassifier()
    await model.train(method, {
      ...DefaultTrainArgs,
      ...args,
      output: outPath,
      verbose: FAST_TEXT_VERBOSITY
    } as Options)
    this._modelPath = outPath

    if (!this.lazy) {
      if (!this.queryOnly) {
        await this._getModel()
      }
      await this._getQuery()
    }
  }

  public async loadFromFile(modelPath: string): Promise<void> {
    this._modelPath = this._cleanPath(modelPath)
    if (!this.lazy) {
      if (!this.queryOnly) {
        await this._getModel()
      }

      await this._getQuery()
    }
  }

  public async predict(str: string, nbLabels: number): Promise<MLToolkit.FastText.PredictResult[]> {
    if (this.queryOnly) {
      throw new Error("This model is marked as Query Only, which doesn't support Prediction")
    }

    const model = await this._getModel()
    return model.predict(str, nbLabels)
  }

  public async queryWordVectors(word: string): Promise<number[]> {
    const query = await this._getQuery()
    return query.getWordVector(word)
  }

  public async queryNearestNeighbors(word: string, nb: number): Promise<string[]> {
    const query = await this._getQuery()
    const ret = await query.nn(word, nb)
    return ret.map((x) => x.label)
  }

  private async _getModel(): Promise<any> {
    const bb = Bluebird.resolve(this._modelPromise!)
    if (this._modelPromise && !bb.isRejected()) {
      this._resetModelBomb()
      return this._modelPromise
    }

    const model = await makeClassifier()
    this._modelPromise = new Promise((resolve, reject) => {
      model
        .loadModel(this.modelPath)
        .then(() => {
          resolve(model)
          this._resetModelBomb()
        })
        .catch((err) => reject(new VError(err, `Model = "${this.modelPath}"`)))
    })

    return this._modelPromise
  }

  private async _getQuery(): Promise<Query> {
    const bb = Bluebird.resolve(this._queryPromise!)
    if (this._queryPromise && !bb.isRejected()) {
      this._resetQueryBomb()
      return this._queryPromise
    }

    this._queryPromise = new Promise(async (resolve, reject) => {
      try {
        const q = await makeQuery(this.modelPath)
        await q.getWordVector('hydrate') // hydration as fastText loads models lazily
        resolve(q)
        this._resetQueryBomb()
      } catch (err) {
        reject(new VError(err, `Model = "${this.modelPath}"`))
      }
    })

    return this._queryPromise
  }

  private _resetModelBomb() {
    if (this.keepInMemory) {
      return
    }

    if (this._modelTimeout) {
      clearTimeout(this._modelTimeout)
    }

    this._modelTimeout = setTimeout(() => (this._modelPromise = undefined), FAST_TEXT_CLEANUP_MS)
  }

  private _resetQueryBomb() {
    if (this.keepInMemory) {
      return
    }

    if (this._queryTimeout) {
      clearTimeout(this._queryTimeout)
    }

    this._queryTimeout = setTimeout(() => (this._queryPromise = undefined), FAST_TEXT_CLEANUP_MS)
  }

  private _cleanPath(modelPath: string): string {
    return modelPath.replace(/\.bin$/i, '')
  }
}
