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

// export type Model = {
//   cleanup: () => void
//   trainToFile: (method: TrainCommand, modelPath: string, args: Partial<TrainArgs>) => Promise<void>
//   loadFromFile: (modelPath: string) => Promise<void>
//   predict: (str: string, nbLabels: number) => Promise<PredictResult[]>
//   queryWordVectors(word: string): Promise<number[]>
//   queryNearestNeighbors(word: string, nb: number): Promise<string[]>
// }

// export type ModelConstructor = {
//   new (): Model
//   new (lazy: boolean, keepInMemory: boolean, queryOnly: boolean): Model
// }

// export const Model: ModelConstructor
