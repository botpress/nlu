import _ from 'lodash'
import seedrandom from 'seedrandom'
import { Data } from '../typings'
import { BaseKFold } from './base'
import { Fold } from './typings'

export class RandomKFold extends BaseKFold {
  constructor(private _seed: number) {
    super()
  }

  public kfold(dataset: Data[], k: number): Fold[] {
    seedrandom(`${this._seed}`, { global: true })
    const samples = _.runInContext().shuffle(dataset)
    seedrandom(`${new Date().getMilliseconds()}`, { global: true })
    return super.kfold(samples, k)
  }
}
