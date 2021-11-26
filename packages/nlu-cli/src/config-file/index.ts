import fse from 'fs-extra'
import { validate } from 'json-schema'
import { YargsSchema, YargsArgv } from '../yargs-utils'
import { generateSchema } from './schema'

interface WriteConfigFileProps<S extends YargsSchema> {
  schemaLocation: string
  fileLocation: string
  yargSchema: S
}

interface ReadConfigFileProps<S extends YargsSchema> {
  fileLocation: string
  yargSchema: S
}

export const writeConfigFile = async <S extends YargsSchema>(props: WriteConfigFileProps<S>): Promise<void> => {
  const { yargSchema, schemaLocation, fileLocation } = props
  const schema = generateSchema(yargSchema)
  const jsonConfig = { $schema: schemaLocation }
  await fse.writeFile(schemaLocation, JSON.stringify(schema, null, 2))
  await fse.writeFile(fileLocation, JSON.stringify(jsonConfig, null, 2))
}

export const readConfigFile = async <S extends YargsSchema>(props: ReadConfigFileProps<S>): Promise<YargsArgv<S>> => {
  const { fileLocation, yargSchema } = props
  const configFileContent = await fse.readFile(fileLocation, 'utf8')
  const parsedConfigFile = JSON.parse(configFileContent)
  const schema = generateSchema(yargSchema)
  const validationResult = validate(parsedConfigFile, schema)
  const { valid, errors } = validationResult
  if (!valid) {
    const errorMsg = errors.map((err) => `${err.property}:${err.message}`).join('\n')
    throw new Error(errorMsg)
  }
  return parsedConfigFile
}
