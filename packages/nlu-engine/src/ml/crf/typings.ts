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

export type ITagger = {
  tag(xseq: string[][]): { probability: number; result: string[] }
  marginal(xseq: string[][]): { [label: string]: number }[]
}
