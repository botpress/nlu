import _kmeans from 'ml-kmeans'

export type KMeansOptions = {
  maxIterations?: number
  tolerance?: number
  withIterations?: boolean
  distanceFunction?: DistanceFunction
  seed?: number
  initialization?: 'random' | 'kmeans++' | 'mostDistant' | number[][]
}

export type Centroid = {
  centroid: number[]
  error: number
  size: number
}

// TODO convert this to class we build the source of ml-kmeans
export type KmeansResult = {
  // constructor(
  //   clusters: number[],
  //   centroids: Centroid[],
  //   converged: boolean,
  //   iterations: number,
  //   distance: DistanceFunction
  // )
  clusters: number[]
  centroids: Centroid[]
  iterations: number
  nearest: (data: DataPoint[]) => number[]
}

export type DataPoint = number[]

export type DistanceFunction = (point0: DataPoint, point1: DataPoint) => number

type KmeansFunc = (data: DataPoint[], K: number, options: KMeansOptions) => KmeansResult

export const kmeans: KmeansFunc = _kmeans
