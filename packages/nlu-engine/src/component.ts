import * as ptb from '@botpress/ptb-schema'

type Predictor<PredictInput, PredictOutput> = {
  predict: (u: PredictInput) => Promise<PredictOutput>
}

export type PipelineComponent<TrainInput, Model extends ptb.PTBMessage<any>, PredictInput, PredictOutput> = Predictor<
  PredictInput,
  PredictOutput
> & {
  readonly name: string
  readonly modelType: Model
  train: (input: TrainInput, progress: (p: number) => void) => Promise<ptb.Infer<Model>>
  load: (model: ptb.Infer<Model>) => Promise<void>
}

export type PredictorOf<C> = C extends PipelineComponent<any, infer M, infer X, infer Y> ? Predictor<X, Y> : never
export type ModelOf<C extends PipelineComponent<any, ptb.PTBMessage<any>, any, any>> = ptb.Infer<C['modelType']>
