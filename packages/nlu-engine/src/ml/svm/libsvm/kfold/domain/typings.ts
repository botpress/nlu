export type Pair<T> = [T, T]
export type SerializedDomain = number | Pair<number>

export type Domain = {
  format(): string
  includes(k: number): boolean
  isEqual(dom: Domain): boolean
  getClosest(k: number): number | undefined

  intersects(dom: ContinuousDomain): boolean
  union(dom: ContinuousDomain): SparsedDomain
  intersection(dom: ContinuousDomain): SparsedDomain
  difference(dom: ContinuousDomain): SparsedDomain
}

export type ContinuousDomain = {
  readonly min: number
  readonly max: number
  clone(): ContinuousDomain
} & Domain

export type SparsedDomain = {
  readonly parts: ContinuousDomain[]
  clone(): SparsedDomain
} & Domain
