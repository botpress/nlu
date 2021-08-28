import _ from 'lodash'
import { SparsedDomain } from './sparsed-domain'
import { SparsedDomain as ISparsedDomain, ContinuousDomain as IContinuousDomain, SerializedDomain } from './typings'

export class ContinuousDomain implements IContinuousDomain {
  private _min: number
  private _max: number

  constructor(range: SerializedDomain) {
    if (_.isNumber(range)) {
      this._min = range
      this._max = range
      return
    }

    if (range[0] < range[1]) {
      this._min = range[0]
      this._max = range[1]
      return
    }
    this._min = range[1]
    this._max = range[0]
  }

  public get min() {
    return this._min
  }
  public get max() {
    return this._max
  }

  public format(): string {
    if (this.min === this.max) {
      return `{${this.min}}`
    }
    return `{${this.min} ... ${this.max}}`
  }

  public includes(k: number) {
    return this.min <= k && this.max >= k
  }

  public intersects(dom: IContinuousDomain) {
    return this.includes(dom.min) || this.includes(dom.max) || dom.includes(this.min) || dom.includes(this.max)
  }

  public union(dom: IContinuousDomain): ISparsedDomain {
    if (!this.intersects(dom)) {
      return SparsedDomain.from(this, dom)
    }

    const min = Math.min(this.min, dom.min)
    const max = Math.max(this.max, dom.max)
    const union = new ContinuousDomain([min, max])
    return SparsedDomain.from(union)
  }

  public intersection(dom: IContinuousDomain): ISparsedDomain {
    if (!this.intersects(dom)) {
      return SparsedDomain.from()
    }

    const min = Math.max(this.min, dom.min)
    const max = Math.min(this.max, dom.max)
    const intersection = new ContinuousDomain([min, max])
    return SparsedDomain.from(intersection)
  }

  public difference(dom: IContinuousDomain): ISparsedDomain {
    if (!this.intersects(dom)) {
      return SparsedDomain.from(this)
    }

    const union = this.union(dom).parts[0]
    const intersection = this.intersection(dom).parts[0]

    const diff: ContinuousDomain[] = []
    if (union.min !== intersection.min && !dom.includes(union.min!)) {
      diff.push(new ContinuousDomain([union.min!, intersection.min! - 1]))
    }

    if (union.max !== intersection.max && !dom.includes(union.max!)) {
      diff.push(new ContinuousDomain([intersection.max! + 1, union.max!]))
    }

    return SparsedDomain.from(...diff)
  }

  public isEqual(dom: ContinuousDomain) {
    return this.min === dom.min && this.max === dom.max
  }

  public getClosest(k: number): number {
    if (this.includes(k)) {
      return k
    }
    if (k < this.min) {
      return this.min
    }
    return this.max
  }

  public clone(): ContinuousDomain {
    const clone = new ContinuousDomain([this.min, this.max])
    return clone
  }
}
