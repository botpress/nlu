import decamelize from 'decamelize'
import yargs from 'yargs'
import yn from 'yn'
import { YargsParameters } from './yargs-utils'

type Argv<T extends YargsParameters> = yargs.Arguments<yargs.InferredOptionTypes<T>>

const isUndefined = <T>(x: T | undefined): x is undefined => x === undefined
const isDefined = <T>(x: T | undefined): x is T => x !== undefined

const parseSingleEnv = <O extends yargs.Options>(
  yargSchema: O,
  envVarValue: string | undefined
): yargs.InferredOptionType<O> | undefined => {
  if (isUndefined(envVarValue)) {
    return
  }

  if (yargSchema.type === 'string') {
    const parsed: string = envVarValue
    return parsed as any // typescript is dumb
  }
  if (yargSchema.type === 'number') {
    const parsed: number = parseFloat(envVarValue)
    if (isNaN(parsed)) {
      return
    }
    return parsed as any // typescript is dumb
  }

  if (yargSchema.type === 'boolean') {
    const parsed: boolean = !!yn(envVarValue)
    return parsed as any // typescript is dumb
  }
}

/**
 *
 * Fills the argv datastructure returned by yargs with value of environment variables.
 * For the CLI parameter --languageURL the expected environment variable is LANGUAGE_URL
 *
 * @param yargsSchema the yargs builder parameter that declares what named parameters are required
 * @param argv the filled argv datastructure returned by yargs
 */
export const parseEnv = <T extends YargsParameters>(yargsSchema: T, argv: Argv<T>): Argv<T> => {
  for (const param in yargsSchema) {
    const envVarName = decamelize(param, { preserveConsecutiveUppercase: true, separator: '_' }).toUpperCase()
    const envVarValue = process.env[envVarName]
    const schema = yargsSchema[param]
    const parsedEnvValue = parseSingleEnv(schema, envVarValue)
    if (isUndefined(argv[param]) && isDefined(parsedEnvValue)) {
      ;(argv as yargs.InferredOptionTypes<T>)[param] = parsedEnvValue
    }
  }
  return argv
}
