import yargs from 'yargs'

export interface YargsParameters {
  [key: string]: yargs.Options
}

export const asYargs = <T extends YargsParameters>(x: T): T => {
  return x
}
