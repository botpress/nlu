import assert from 'assert'
import _ from 'lodash'
import numeric from 'numeric'
import { Logger } from '../../../typings'

import BaseSVM from './base-svm'
import { checkConfig, defaultConfig } from './config'
import gridSearch from './grid-search'
import { GridSearchResult } from './grid-search/typings'
import { normalizeDataset, normalizeInput } from './normalize'
import reduce from './reduce-dataset'
import { Data, Report, SvmConfig, SvmModel } from './typings'

class NoTrainedModelError extends Error {
  constructor() {
    super('Cannot predict because there is no trained model.')
  }
}

type TrainOutput = {
  model: SvmModel
  report?: Report
}

type Trained = {
  svm: BaseSVM
  model: SvmModel
}

export class SVM {
  private _config: SvmConfig
  private _trained: Trained | undefined
  private _retainedVariance: number = 0
  private _retainedDimension: number = 0
  private _initialDimension: number = 0
  private _isCanceled: boolean = false

  constructor(config: Partial<SvmConfig>, private _logger?: Logger) {
    this._config = { ...checkConfig(defaultConfig(config)) }
  }

  public async initialize(model: SvmModel) {
    const self = this
    const svm = await BaseSVM.restore(model)
    this._trained = {
      svm,
      model
    }

    Object.entries(model.param).forEach(([key, val]) => {
      self._config[key] = val
    })
  }

  public cancelTraining = () => {
    this._isCanceled = true
  }

  public train = async (
    dataset: Data[],
    seed: number,
    progressCb: (progress: number) => void
  ): Promise<TrainOutput> => {
    const dims = numeric.dim(dataset)
    assert(dims[0] > 0 && dims[1] === 2 && dims[2] > 0, 'dataset must be an list of [X,y] tuples')

    let mu: number[] | undefined
    let sigma: number[] | undefined
    let u: number[][] | undefined

    if (this._config.normalize) {
      const norm = normalizeDataset(dataset)
      mu = norm.mu
      sigma = norm.sigma
      dataset = norm.dataset
    }

    if (!this._config.reduce) {
      this._retainedVariance = 1
      this._retainedDimension = dims[2]
      this._initialDimension = dims[2]
    } else {
      const red = reduce(dataset, this._config.retainedVariance)
      u = red.U
      this._retainedVariance = red.retainedVariance
      this._retainedDimension = red.newDimension
      this._initialDimension = red.oldDimension
      dataset = red.dataset
    }

    const gridSearchResult = await gridSearch(this._logger)(dataset, this._config, seed, (progress) =>
      progressCb(progress.done / (progress.total + 1))
    )

    const { params, report } = gridSearchResult
    const svm = new BaseSVM()
    const trainOutput = await svm.train(dataset, seed, params)
    const model: SvmModel = { ...trainOutput, mu, sigma, u }
    this._trained = {
      svm,
      model
    }

    progressCb(1)

    if (report) {
      const fullReport: Report = {
        ...report,
        reduce: this._config.reduce,
        retainedVariance: this._retainedVariance,
        retainedDimension: this._retainedDimension,
        initialDimension: this._initialDimension
      }
      return { model, report: fullReport }
    }
    return { model }
  }

  public free = () => {
    this._trained?.svm.free()
  }

  public isTrained = () => {
    return !!this._trained ? this._trained.svm.isTrained() : false
  }

  public predict = (x: number[]) => {
    if (!this._trained) {
      throw new NoTrainedModelError()
    }
    const { svm, model } = this._trained
    const formattedInput = this._format(model, x)
    return svm.predict(formattedInput)
  }

  public predictSync = (x: number[]) => {
    if (!this._trained) {
      throw new NoTrainedModelError()
    }
    const { svm, model } = this._trained
    const formattedInput = this._format(model, x)
    return svm.predictSync(formattedInput)
  }

  public predictProbabilities = (x: number[]) => {
    if (!this._trained) {
      throw new NoTrainedModelError()
    }
    const { svm, model } = this._trained
    const formattedInput = this._format(model, x)
    return svm.predictProbabilities(formattedInput)
  }

  public predictProbabilitiesSync = (x: number[]) => {
    if (!this._trained) {
      throw new NoTrainedModelError()
    }
    const { svm, model } = this._trained
    const formattedInput = this._format(model, x)
    return svm.predictProbabilitiesSync(formattedInput)
  }

  private _format = (model: SvmModel, x: number[]) => {
    const { u, mu, sigma } = model
    if (mu && sigma) {
      x = normalizeInput(x, mu, sigma)
    }
    if (u) {
      x = numeric.dot(x, u) as number[]
    }
    return x
  }
}
