import ptb, { MapField } from 'protobufjs'
import { InferFromStructSchema } from './inference'
import { BasicStructSchema, Field, StructSchema, BasicField, BasicMapField } from './typings'

type Props = {
  namespace: ptb.Namespace
  type: ptb.Type
  childTypes: ptb.Type[]
}

export const isBaseField = (f: Field | MapField): f is BasicField | BasicMapField => {
  return !(f.type instanceof PTBMessage)
}

export const isFlatSchema = (s: StructSchema): s is BasicStructSchema => {
  return Object.values(s).every(isBaseField)
}

export class PTBMessage<S extends StructSchema> {
  private _namespace: ptb.Namespace
  private _childTypes: ptb.Type[] = []
  private _innerType: ptb.Type

  public get name() {
    return this._name
  }

  public get schema() {
    return this._schema
  }

  private static _fromFlatSchema = (name: string, schema: BasicStructSchema): Props => {
    const type = ptb.Type.fromJSON(name, { fields: schema })
    const childTypes: ptb.Type[] = []
    const namespace = ptb.Namespace.fromJSON(`${name}_namespace`, {})
    namespace.add(type)
    return { type, childTypes, namespace }
  }

  private static _fromNestedSchema = (name: string, schema: StructSchema): Props => {
    const childTypes: ptb.Type[] = []
    const fields: { [k: string]: ptb.IField } = {}

    for (const fieldName in schema) {
      const fieldValue: Field = schema[fieldName]
      const fieldType = fieldValue.type instanceof PTBMessage ? fieldValue.type.clone() : fieldValue.type

      let currentField: ptb.IField
      if (fieldType instanceof PTBMessage) {
        const newChildTypes = [fieldType._innerType, ...fieldType._childTypes].filter(
          (ct) => !childTypes.map(({ name }) => name).includes(ct.name)
        )
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
      namespace,
      type,
      childTypes
    }
  }

  constructor(private _name: string, private _schema: S) {
    const { type, childTypes, namespace } = isFlatSchema(_schema)
      ? PTBMessage._fromFlatSchema(_name, _schema)
      : PTBMessage._fromNestedSchema(_name, _schema)
    this._innerType = type
    this._childTypes = childTypes
    this._namespace = namespace
  }

  public clone() {
    return new PTBMessage(this._name, this._schema)
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
