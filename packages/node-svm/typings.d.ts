export const makeSvm: (args?: { random_seed: number }) => Promise<NSVM>

export interface NSVM {
  train(params: Parameters & { mute: number }, x: number[][], y: number[]): void
  predict(x: number[]): number
  predict_probability(x: number[]): ProbabilityResult
  set_model(model: Model): void
  get_model(): Model
  free_model(): void
  is_trained(): boolean
}

interface ProbabilityResult {
  prediction: number
  probabilities: number[]
}

export interface Model {
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

export interface Parameters {
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
