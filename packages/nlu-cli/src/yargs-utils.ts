import yargs from 'yargs'

export interface YargsSchema {
  [key: string]: yargs.Options
}

export type YargsArgv<T extends YargsSchema> = yargs.Arguments<yargs.InferredOptionTypes<T>>

export const asYargs = <T extends YargsSchema>(x: T): T => {
  return x
}
