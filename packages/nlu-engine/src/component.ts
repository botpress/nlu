type Predictor<PredictInput, PredictOutput> = {
  predict: (u: PredictInput) => Promise<PredictOutput>
}

export type PipelineComponent<TrainInput, Model, PredictInput, PredictOutput> = Predictor<
  PredictInput,
  PredictOutput
> & {
  readonly name: string
  train: (input: TrainInput, progress: (p: number) => void) => Promise<Model>
  load: (model: Model) => Promise<void>
}

export type PredictorOf<C> = C extends PipelineComponent<any, any, infer X, infer Y> ? Predictor<X, Y> : never
export type ModelOf<C> = C extends PipelineComponent<any, infer M, any, any> ? M : never
