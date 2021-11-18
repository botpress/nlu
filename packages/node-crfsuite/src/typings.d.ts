export const makeTrainer: (args?: TrainerOptions) => Promise<Trainer>
export const makeTagger: () => Promise<Tagger>

export declare class Tagger {
  tag(xseq: Array<string[]>): { probability: number; result: string[] }
  open(model_filename: string): boolean
  marginal(xseq: Array<string[]>): { [key: string]: number }[]
}

export interface Options {
  [key: string]: string
}

export interface TrainerOptions {
  [key: string]: any
  debug?: boolean
}

export declare class Trainer {
  constructor(opts?: TrainerOptions)
  append(xseq: Array<string[]>, yseq: string[]): void
  train(model_filename: string, cb?: (iteration: number) => number | undefined): number
  train_async(model_filename: string, cb?: (iteration: number) => number | undefined): Promise<number>
  get_params(options: Options): any
  set_params(options: Options): void
}
