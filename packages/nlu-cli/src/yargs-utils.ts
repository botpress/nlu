import { Dictionary } from 'lodash'
import yargs from 'yargs'

export type YargsOptionType = Exclude<yargs.Options['type'], 'count'>
export type YargsOption = yargs.Options & { type?: YargsOptionType }
export type YargsSchema = Dictionary<YargsOption>

export type YargsArgv<T extends YargsSchema> = yargs.Arguments<yargs.InferredOptionTypes<T>>

export const asYargs = <T extends YargsSchema>(x: T): T => {
  return x
}
