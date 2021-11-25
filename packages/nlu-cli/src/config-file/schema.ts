import { JSONSchema7 } from 'json-schema'
import { YargsSchema } from '../yargs-utils'

export const generateSchema = (yargSchema: YargsSchema): JSONSchema7 => {
  const schema: JSONSchema7 = {
    type: 'object',
    properties: {}
  }
  return schema
}
