export const makeTrainer: (args?: TrainerOptions) => Promise<Trainer>
export const makeTagger: () => Promise<Tagger>

export declare class Tagger {
  public tag(xseq: Array<string[]>): { probability: number; result: string[] }
  public open(model_filename: string): boolean
  public marginal(xseq: Array<string[]>): { [key: string]: number }[]
}

export type Options = {
  [key: string]: string
}

export type TrainerOptions = {
  [key: string]: any
  debug?: boolean
}

export declare class Trainer {
  constructor(opts?: TrainerOptions)
  public append(xseq: Array<string[]>, yseq: string[]): void
  public train(model_filename: string, cb?: (iteration: number) => number | undefined): number
  public train_async(model_filename: string, cb?: (iteration: number) => number | undefined): Promise<number>
  public get_params(options: Options): any
  public set_params(options: Options): void
}
