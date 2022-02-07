export namespace MLToolkit {
  export namespace FastText {
    export type TrainCommand = 'supervised' | 'quantize' | 'skipgram' | 'cbow'
    export type Loss = 'hs' | 'softmax'

    export type TrainArgs = {
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

    export type PredictResult = {
      label: string
      value: number
    }

    export type Model = {
      cleanup: () => void
      trainToFile: (method: TrainCommand, modelPath: string, args: Partial<TrainArgs>) => Promise<void>
      loadFromFile: (modelPath: string) => Promise<void>
      predict: (str: string, nbLabels: number) => Promise<PredictResult[]>
      queryWordVectors(word: string): Promise<number[]>
      queryNearestNeighbors(word: string, nb: number): Promise<string[]>
    }

    export type ModelConstructor = {
      new (): Model
      new (lazy: boolean, keepInMemory: boolean, queryOnly: boolean): Model
    }

    export const Model: ModelConstructor
  }

  export namespace KMeans {
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

    export const kmeans: (data: DataPoint[], K: number, options: KMeansOptions) => KmeansResult
  }

  export namespace SVM {
    export type SVMOptions = {
      classifier: 'C_SVC' | 'NU_SVC' | 'ONE_CLASS' | 'EPSILON_SVR' | 'NU_SVR'
      kernel: 'LINEAR' | 'POLY' | 'RBF' | 'SIGMOID'
      seed: number
      c?: number | number[]
      gamma?: number | number[]
      probability?: boolean
      reduce?: boolean
    }

    export type DataPoint = {
      label: string
      coordinates: number[]
    }

    export type Prediction = {
      label: string
      confidence: number
    }

    export type TrainProgressCallback = {
      (progress: number): void
    }

    export class Trainer {
      constructor(logger: Logger)
      public train(points: DataPoint[], options?: SVMOptions, callback: TrainProgressCallback): Promise<Buffer>
      public isTrained(): boolean
    }

    export class Predictor {
      constructor(model: Buffer)
      public initialize(): Promise<void>
      public predict(coordinates: number[]): Promise<Prediction[]>
      public isLoaded(): boolean
      public getLabels(): string[]
    }
  }

  export namespace CRF {
    export class Tagger {
      public initialize(): Promise<void>
      public tag(xseq: Array<string[]>): { probability: number; result: string[] }
      public open(model: Buffer): boolean
      public marginal(xseq: Array<string[]>): { [label: string]: number }[]
    }

    export type TrainerOptions = {
      [key: string]: string
    }

    export type TrainProgressCallback = {
      (iteration: number): void
    }

    type DataPoint = {
      features: Array<string[]>
      labels: string[]
    }

    export class Trainer {
      constructor(logger: Logger)
      public initialize(): Promise<void>
      public train(
        elements: DataPoint[],
        options: TrainerOptions,
        progressCallback: TrainProgressCallback
      ): Promise<Buffer>
    }
  }

  export namespace SentencePiece {
    export type Processor = {
      loadModel: (modelPath: string) => void
      encode: (inputText: string) => string[]
      decode: (pieces: string[]) => string
    }

    export const createProcessor: () => Promise<Processor>
  }
}
