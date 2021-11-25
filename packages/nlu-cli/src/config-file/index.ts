import { YargsSchema, YargsArgv } from '../yargs-utils'

interface WriteConfigFileProps {
  schemaLocation: string
  fileLocation: string
  yargSchema: YargsSchema
}

interface ReadConfigFileProps {
  fileLocation: string
  yargSchema: YargsSchema
}

export const writeConfigFile = async (props: WriteConfigFileProps): Promise<void> => {
  throw new Error('Not implemented yet.')
}

export const readConfigFile = <S extends YargsSchema>(props: ReadConfigFileProps): Promise<YargsArgv<S>> => {
  throw new Error('Not implemented yet.')
}
