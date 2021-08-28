import { SparsedDomain } from './sparsed-domain'
import { SerializedDomain } from './typings'

export class Domain {
  private _domain: SparsedDomain

  constructor(...doms: SerializedDomain[]) {
    this._domain = new SparsedDomain(...doms)
  }

  public format(): string {
    return this._domain.format()
  }

  public union(dom: Domain) {
    const clone = this.clone()
    for (const part of dom._domain.parts) {
      clone._domain = clone._domain.union(part)
    }
    return clone
  }

  public intersection(dom: Domain) {
    const clone = this.clone()
    for (const part of dom._domain.parts) {
      clone._domain = clone._domain.intersection(part)
    }
    return clone
  }

  public difference(dom: Domain) {
    const clone = this.clone()
    for (const part of dom._domain.parts) {
      clone._domain = clone._domain.difference(part)
    }
    return clone
  }

  public intersects(dom: Domain) {
    return dom._domain.parts.some((dx) => this._domain.intersects(dx))
  }

  public includes(k: number): boolean {
    return this._domain.includes(k)
  }

  public getClosest(k: number): number | undefined {
    return this._domain.getClosest(k)
  }

  public isEmpty() {
    return this._domain.isEmpty()
  }

  public isEqual(dom: Domain): boolean {
    return this._domain.isEqual(dom._domain)
  }

  public clone(): Domain {
    const clone = new Domain()
    clone._domain = this._domain.clone()
    return clone
  }
}
