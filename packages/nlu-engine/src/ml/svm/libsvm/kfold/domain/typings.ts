export type Pair<T> = [T, T]
export type SerializedDomain = number | Pair<number>

export interface Domain {
  format(): string
  includes(k: number): boolean
  isEqual(dom: Domain): boolean
  getClosest(k: number): number | undefined

  intersects(dom: ContinuousDomain): boolean
  union(dom: ContinuousDomain): SparsedDomain
  intersection(dom: ContinuousDomain): SparsedDomain
  difference(dom: ContinuousDomain): SparsedDomain
}

export interface ContinuousDomain extends Domain {
  readonly min: number
  readonly max: number
  clone(): ContinuousDomain
}

export interface SparsedDomain extends Domain {
  readonly parts: ContinuousDomain[]
  clone(): SparsedDomain
}
