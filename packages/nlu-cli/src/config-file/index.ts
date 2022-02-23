import fse from 'fs-extra'
import { validate } from 'json-schema'
import os from 'os'
import { YargsSchema, YargsArgv } from '../yargs-utils'
import { generateSchema } from './schema'
import { toUnix } from './to-unix'

type WriteConfigFileProps<S extends YargsSchema> = {
  schemaLocation: string
  fileLocation: string
  yargSchema: S
  force?: boolean
}

type ReadConfigFileProps<S extends YargsSchema> = {
  fileLocation: string
  yargSchema: S
}

export const writeConfigFile = async <S extends YargsSchema>(props: WriteConfigFileProps<S>): Promise<void> => {
  const { yargSchema, schemaLocation, fileLocation, force } = props
  const schema = generateSchema(yargSchema)

  const $schema = os.platform() !== 'win32' ? schemaLocation : toUnix(schemaLocation)
  const jsonConfig = { $schema }
  await fse.writeFile(schemaLocation, JSON.stringify(schema, null, 2))

  if (!force && fse.existsSync(fileLocation)) {
    throw new Error(`File ${fileLocation} already exists.`)
  }
  await fse.writeFile(fileLocation, JSON.stringify(jsonConfig, null, 2))
}

export const readConfigFile = async <S extends YargsSchema>(props: ReadConfigFileProps<S>): Promise<YargsArgv<S>> => {
  const { fileLocation, yargSchema } = props
  const configFileContent = await fse.readFile(fileLocation, 'utf8')
  const { $schema, ...parsedConfigFile } = JSON.parse(configFileContent)
  const schema = generateSchema(yargSchema)
  const validationResult = validate(parsedConfigFile, schema)
  const { valid, errors } = validationResult
  if (!valid) {
    const errorMsg = errors.map((err) => `${err.property} ${err.message}`).join('\n')
    throw new Error(errorMsg)
  }
  return parsedConfigFile
}
