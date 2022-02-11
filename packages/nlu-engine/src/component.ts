type Predictor<PredictInput, PredictOutput> = {
  predict: (u: PredictInput) => Promise<PredictOutput>
}

export type PipelineComponent<TrainInput, PredictInput, PredictOutput> = Predictor<PredictInput, PredictOutput> & {
  readonly name: string
  train: (input: TrainInput, progress: (p: number) => void) => Promise<Buffer>
  load: (model: Buffer) => Promise<void>
}

export type PredictorOf<C extends PipelineComponent<any, any, any>> = C extends PipelineComponent<any, infer X, infer Y>
  ? Predictor<X, Y>
  : never
