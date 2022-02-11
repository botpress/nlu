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

export type SVMTrainInput = {
  points: DataPoint[]
  options: SVMOptions
}
