export type TrainerOptions = {
  [key: string]: string
}

export type TrainProgressCallback = {
  (iteration: number): void
}

export type DataPoint = {
  features: Array<string[]>
  labels: string[]
}

export type CRFTrainInput = {
  elements: DataPoint[]
  options: TrainerOptions
}

export type TagPrediction = { probability: number; result: string[] }
export type MarginalPrediction = { [label: string]: number }
