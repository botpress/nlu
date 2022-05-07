import decamelize from 'decamelize'
import _ from 'lodash'
import yargs from 'yargs'
import yn from 'yn'
import { YargsSchema } from './yargs-utils'

const parseSingleEnv = <O extends yargs.Options>(
  yargSchema: O,
  envVarValue: string
): yargs.InferredOptionType<O> | undefined => {
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

  if (yargSchema.choices?.includes(envVarValue)) {
    const parsed: string = envVarValue
    return parsed as any // typescript is dumb
  }
}

const tryExtractingFromEnv = <O extends yargs.Options>(
  paramName: string,
  schema: O,
  prefix: string | undefined
): yargs.InferredOptionType<O> | undefined => {
  const possibleNames: string[] = [paramName]
  const { alias } = schema
  if (_.isString(alias) && alias) {
    possibleNames.push(alias)
  } else if (_.isArray(alias)) {
    possibleNames.push(...alias)
  }

  for (const paramAlias of possibleNames) {
    let envVarName = decamelize(paramAlias, { preserveConsecutiveUppercase: true, separator: '_' }).toUpperCase()
    envVarName = prefix ? `${prefix.toUpperCase()}_${envVarName}` : envVarName
    const envVarValue = process.env[envVarName]
    if (!envVarValue) {
      continue
    }

    const parsedEnvValue = parseSingleEnv(schema, envVarValue)
    if (parsedEnvValue !== undefined) {
      return parsedEnvValue
    }
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
export const parseEnv = <T extends YargsSchema>(
  yargsSchema: T,
  prefix: string | undefined = undefined
): Partial<yargs.InferredOptionTypes<T>> => {
  const returned: Partial<yargs.InferredOptionTypes<T>> = {}
  for (const param in yargsSchema) {
    const schema = yargsSchema[param]
    const extracted = tryExtractingFromEnv(param, schema, prefix)
    if (extracted !== undefined) {
      returned[param] = extracted
    }
  }
  return returned
}
