export namespace MLToolkit {
  export namespace FastText {
    export type TrainCommand = 'supervised' | 'quantize' | 'skipgram' | 'cbow'
    export type Loss = 'hs' | 'softmax'

    export interface TrainArgs {
      lr: number
      dim: number
      ws: number
      epoch: number
      minCount: number
      minCountLabel: number
      neg: number
      wordNgrams: number
      loss: Loss
      model: string
      input: string
      bucket: number
      minn: number
      maxn: number
      thread: number
      lrUpdateRate: number
      t: number
      label: string
      pretrainedVectors: string
      qout: boolean
      retrain: boolean
      qnorm: boolean
      cutoff: number
      dsub: number
    }

    export interface PredictResult {
      label: string
      value: number
    }

    export interface Model {
      cleanup: () => void
      trainToFile: (method: TrainCommand, modelPath: string, args: Partial<TrainArgs>) => Promise<void>
      loadFromFile: (modelPath: string) => Promise<void>
      predict: (str: string, nbLabels: number) => Promise<PredictResult[]>
      queryWordVectors(word: string): Promise<number[]>
      queryNearestNeighbors(word: string, nb: number): Promise<string[]>
    }

    export interface ModelConstructor {
      new (): Model
      new (lazy: boolean, keepInMemory: boolean, queryOnly: boolean): Model
    }

    export const Model: ModelConstructor
  }

  export namespace KMeans {
    export interface KMeansOptions {
      maxIterations?: number
      tolerance?: number
      withIterations?: boolean
      distanceFunction?: DistanceFunction
      seed?: number
      initialization?: 'random' | 'kmeans++' | 'mostDistant' | number[][]
    }

    export interface Centroid {
      centroid: number[]
      error: number
      size: number
    }

    // TODO convert this to class we build the source of ml-kmeans
    export interface KmeansResult {
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

    export const kmeans: (data: DataPoint[], K: number, options: KMeansOptions) => KmeansResult
  }

  export namespace SVM {
    export interface SVMOptions {
      classifier: 'C_SVC' | 'NU_SVC' | 'ONE_CLASS' | 'EPSILON_SVR' | 'NU_SVR'
      kernel: 'LINEAR' | 'POLY' | 'RBF' | 'SIGMOID'
      seed: number
      c?: number | number[]
      gamma?: number | number[]
      probability?: boolean
      reduce?: boolean
    }

    export interface DataPoint {
      label: string
      coordinates: number[]
    }

    export interface Prediction {
      label: string
      confidence: number
    }

    export interface TrainProgressCallback {
      (progress: number): void
    }

    export class Trainer {
      constructor(logger?: Logger)
      train(points: DataPoint[], options?: SVMOptions, callback: TrainProgressCallback): Promise<string>
      isTrained(): boolean
    }

    export class Predictor {
      constructor(model: string)
      initialize(): Promise<void>
      predict(coordinates: number[]): Promise<Prediction[]>
      isLoaded(): boolean
      getLabels(): string[]
    }
  }

  export namespace CRF {
    export class Tagger {
      initialize(): Promise<void>
      tag(xseq: Array<string[]>): { probability: number; result: string[] }
      open(model_filename: string): boolean
      marginal(xseq: Array<string[]>): { [label: string]: number }[]
    }

    export interface TrainerOptions {
      [key: string]: string
    }

    export interface TrainProgressCallback {
      (iteration: number): void
    }

    interface DataPoint {
      features: Array<string[]>
      labels: string[]
    }

    export class Trainer {
      constructor(logger: Logger)
      initialize(): Promise<void>
      train(elements: DataPoint[], options: TrainerOptions, progressCallback: TrainProgressCallback): Promise<string>
    }
  }

  export namespace SentencePiece {
    export interface Processor {
      loadModel: (modelPath: string) => void
      encode: (inputText: string) => string[]
      decode: (pieces: string[]) => string
    }

    export const createProcessor: () => Promise<Processor>
  }
}
