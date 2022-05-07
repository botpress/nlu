import yargs from 'yargs'

type Dic<T> = { [k: string]: T }
type Override<A extends object, B extends object> = Omit<A, keyof B> & B

export type YargsOptionType = Exclude<yargs.Options['type'], 'count'>
export type YargsOption = Override<yargs.Options, { choices?: string[] }> & { type?: YargsOptionType }
export type YargsSchema = Dic<YargsOption>

export type YargsArgv<T extends YargsSchema> = yargs.Arguments<yargs.InferredOptionTypes<T>>

export const asYargs = <T extends YargsSchema>(x: T): T => {
  return x
}
