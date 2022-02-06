import ptb from 'protobufjs'
import { InferFromStructSchema } from './inference'
import { FlatStructSchema, Field, StructSchema, BasicField } from './typings'

type Props = {
  type: ptb.Type
  childTypes: ptb.Type[]
}

export const isBaseField = (f: Field): f is BasicField => {
  return !(f.type instanceof PTBMessage)
}

export const isFlatSchema = (s: StructSchema): s is FlatStructSchema => {
  return Object.values(s).every(isBaseField)
}

export class PTBMessage<S extends StructSchema> {
  private _childTypes: ptb.Type[] = []
  private _innerType: ptb.Type

  public get name() {
    return this._name
  }

  public get schema() {
    return this._schema
  }

  private static _fromFlatSchema = (name: string, schema: FlatStructSchema): Props => {
    const type = ptb.Type.fromJSON(name, { fields: schema })
    const childTypes: ptb.Type[] = []
    return { type, childTypes }
  }

  private static _fromNestedSchema = (name: string, schema: StructSchema): Props => {
    const childTypes: ptb.Type[] = []
    const fields: { [k: string]: ptb.IField } = {}

    for (const fieldName in schema) {
      const fieldValue: Field = schema[fieldName]
      const fieldType = fieldValue.type

      let currentField: ptb.IField
      if (fieldType instanceof PTBMessage) {
        const newChildTypes = [fieldType._innerType, ...fieldType._childTypes].filter((ct) => !childTypes.includes(ct))
        childTypes.push(...newChildTypes)
        currentField = { ...fieldValue, type: fieldType.name }
      } else {
        currentField = { ...fieldValue, type: fieldType }
      }

      fields[fieldName] = currentField
    }

    const namespace = ptb.Namespace.fromJSON(`${name}_namespace`, {})

    const type = ptb.Type.fromJSON(name, { fields })
    for (const innertype of [type, ...childTypes]) {
      namespace.add(innertype)
    }

    return {
      type,
      childTypes
    }
  }

  constructor(private _name: string, private _schema: S) {
    const { type, childTypes } = isFlatSchema(_schema)
      ? PTBMessage._fromFlatSchema(_name, _schema)
      : PTBMessage._fromNestedSchema(_name, _schema)
    this._innerType = type
    this._childTypes = childTypes
  }

  public encode(x: InferFromStructSchema<S>): Uint8Array {
    const msg = this._innerType.create(x)
    return this._innerType.encode(msg).finish()
  }

  public decode(x: Uint8Array): InferFromStructSchema<S> {
    const msg = this._innerType.decode(x)
    return msg as any
  }
}
