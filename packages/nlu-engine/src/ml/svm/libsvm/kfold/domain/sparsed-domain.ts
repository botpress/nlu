import _ from 'lodash'
import { ContinuousDomain } from './continuous-domain'
import { SparsedDomain as ISparsedDomain, ContinuousDomain as IContinuousDomain, SerializedDomain } from './typings'

export class SparsedDomain implements ISparsedDomain {
  private _parts: IContinuousDomain[] = []

  public static from(...cd: IContinuousDomain[]) {
    const instance = new SparsedDomain()
    instance._parts = cd
    return instance
  }

  constructor(...doms: SerializedDomain[]) {
    if (doms.length) {
      this._parts = doms.map((r) => new ContinuousDomain(r))
      this._stack()
    }
  }

  public get parts() {
    return this._parts.map((x) => x.clone())
  }

  public format(): string {
    const inner = this._parts.map((r) => r.format()).join(', ')
    return `{${inner}}`
  }

  private _sort() {
    this._parts.sort((d1, d2) => d1.min - d2.min)
  }

  private _stack() {
    let i = 0
    this._sort()
    while (i < this._parts.length - 1) {
      const current = this._parts[i]
      const next = this._parts[i + 1]
      if (current.intersects(next)) {
        this._parts.splice(i, 2)
        this._parts.push(...current.union(next).parts)
        this._sort()
        i = 0
      }
      i++
    }
  }

  public union(dom: IContinuousDomain) {
    const clone = this.clone()
    clone._parts.push(dom)
    clone._stack()
    return clone
  }

  public intersection(dom: IContinuousDomain) {
    const clone = this.clone()
    clone._parts = _.flatMap(clone._parts, (dj) => dj.intersection(dom).parts)
    clone._stack()
    return clone
  }

  public difference(dom: IContinuousDomain) {
    const clone = this.clone()
    clone._parts = _.flatMap(clone._parts, (dj) => dj.difference(dom).parts)
    clone._stack()
    return clone
  }

  public intersects(dom: IContinuousDomain) {
    return this._parts.some((di) => di.intersects(dom))
  }

  public includes(k: number): boolean {
    return this._parts.some((d) => d.includes(k))
  }

  public getClosest(k: number): number | undefined {
    if (this.isEmpty()) {
      return
    }

    if (this.includes(k)) {
      return k
    }

    let closest: number | undefined
    let min = Number.POSITIVE_INFINITY
    for (const range of this._parts) {
      const currentClosest = range.getClosest(k)
      if (!currentClosest) {
        continue
      }

      const distance = Math.abs(currentClosest - k)
      if (distance < min) {
        closest = currentClosest
        min = distance
      }
    }
    return closest
  }

  public isEmpty() {
    return this._parts.length === 0
  }

  public isEqual(dom: SparsedDomain): boolean {
    return _.zip(this._parts, dom._parts).every(([x1, x2]) => x1 && x2 && x1?.isEqual(x2))
  }

  public clone(): SparsedDomain {
    const clone = new SparsedDomain()
    clone._parts = this._parts.map((r) => r.clone())
    return clone
  }
}
