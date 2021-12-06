import _ from 'lodash'
import nearestVector from 'ml-nearest-vector'
import { MLToolkit } from '../ml/typings'

import { euclideanDistanceSquared } from './tools/math'
import { Intent, SerializedKmeansResult, Tools } from './typings'
import Utterance, { UtteranceToken } from './utterance/utterance'

const NUM_CLUSTERS = 8
const KMEANS_OPTIONS = <MLToolkit.KMeans.KMeansOptions>{
  iterations: 250,
  initialization: 'random',
  seed: 666, // so training is consistent
  distanceFunction: euclideanDistanceSquared
}

export const computeKmeans = (
  intents: Intent<Utterance>[],
  tools: Tools
): MLToolkit.KMeans.KmeansResult | undefined => {
  const data = _.chain(intents)
    .flatMap((i) => i.utterances)
    .flatMap((u) => u.tokens)
    .uniqBy((t: UtteranceToken) => t.value)
    .map((t: UtteranceToken) => t.vector)
    .value() as number[][]

  if (data.length < 2) {
    return
  }

  const k = data.length > NUM_CLUSTERS ? NUM_CLUSTERS : 2

  return tools.mlToolkit.KMeans.kmeans(data, k, KMEANS_OPTIONS)
}

export const serializeKmeans = (kmeans: MLToolkit.KMeans.KmeansResult): SerializedKmeansResult => {
  const { centroids, clusters, iterations } = kmeans
  return { centroids, clusters, iterations }
}

export const deserializeKmeans = (kmeans: SerializedKmeansResult): MLToolkit.KMeans.KmeansResult => {
  const { centroids, clusters, iterations } = kmeans
  const thisNearest = (data: MLToolkit.KMeans.DataPoint[]) => {
    return nearest(kmeans, data)
  }
  return { centroids, clusters, iterations, nearest: thisNearest }
}

/**
 * Copied from https://github.com/mljs/kmeans/blob/master/src/utils.js
 */
export const nearest = (kmeans: SerializedKmeansResult, data: MLToolkit.KMeans.DataPoint[]) => {
  const clusterID: number[] = new Array(data.length)
  const centroids = kmeans.centroids.map((c) => c.centroid)

  for (let i = 0; i < data.length; i++) {
    clusterID[i] = nearestVector(centroids, data[i], {
      distanceFunction: euclideanDistanceSquared
    })
  }

  return clusterID
}
