import { JSONSchema7, JSONSchema7Definition } from 'json-schema'
import { Dictionary } from 'lodash'
import { YargsSchema } from '../yargs-utils'

export const generateSchema = (yargSchema: YargsSchema): JSONSchema7 => {
  const properties: Dictionary<JSONSchema7Definition> = {}
  for (const param in yargSchema) {
    const yargProp = yargSchema[param]

    const { type } = yargProp
    if (yargProp.array) {
      properties[param] = {
        type: 'array',
        items: {
          type: yargProp.type
        }
      }
    } else {
      properties[param] = {
        type
      }
    }
  }

  const schema: JSONSchema7 = {
    type: 'object',
    properties
  }
  return schema
}
