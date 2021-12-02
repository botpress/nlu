export const makeSvm: (args?: { random_seed: number }) => Promise<NSVM>

export type NSVM = {
  train(params: AugmentedParameters, x: number[][], y: number[]): void
  train_async(params: AugmentedParameters, x: number[][], y: number[], cb: (e: null | string) => void): void
  predict(x: number[]): number
  predict_async(x: number[], cb: (p: number) => void): void
  predict_probability(x: number[]): ProbabilityResult
  predict_probability_async(x: number[], cb: (p: ProbabilityResult) => void): void
  set_model(model: Model): void
  get_model(): Model
  free_model(): void
  is_trained(): boolean
}

type ProbabilityResult = {
  prediction: number
  probabilities: number[]
}

export type Model = {
  param: Parameters
  nr_class: number
  l: number
  SV: number[][]
  sv_coef: number[][]
  rho: number[]
  probA: number[]
  probB: number[]
  sv_indices: number[]
  label: number[]
  nSV: number[]
  free_sv: number
}

type AugmentedParameters = {
  mute: number
} & Parameters

export type Parameters = {
  svm_type: number
  kernel_type: number
  degree: number
  gamma: number
  coef0: number
  cache_size: number
  eps: number
  C: number
  nr_weight: number
  weight_label: number[]
  weight: number[]
  nu: number
  p: number
  shrinking: boolean
  probability: boolean
}
