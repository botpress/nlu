export type PipelineComponent<TrainInput, PredictInput, PredictOutput> = {
  readonly name: string
  train: (input: TrainInput, progress: (p: number) => void) => Promise<Buffer>
  load: (model: Buffer) => Promise<void>
  predict: (u: PredictInput) => Promise<PredictOutput>
}
