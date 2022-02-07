import { PTBMessage } from './ptb-struct'
import { Field, FieldType, MapField, NumberFieldType, StructSchema } from './typings'
/**
 * ######################
 * ### type inference ###
 * ######################
 */

export type InferFromStructFieldType<F extends FieldType | PTBMessage<any>> = F extends PTBMessage<infer S>
  ? InferFromStructSchema<S>
  : F extends NumberFieldType
  ? number
  : F extends 'bool'
  ? boolean
  : F extends 'string'
  ? string
  : F extends 'bytes'
  ? Uint8Array
  : never

export type InferFromStructMapField<F extends MapField> = Record<
  InferFromStructFieldType<F['keyType']>,
  InferFromStructFieldType<F['type']>
>

export type InferFromStructNormalField<F extends Field> = F['rule'] extends 'repeated'
  ? InferFromStructFieldType<F['type']>[] | undefined
  : F['rule'] extends 'optional'
  ? InferFromStructFieldType<F['type']> | undefined
  : InferFromStructFieldType<F['type']>

export type InferFromStructField<F extends MapField | Field> = F extends MapField
  ? InferFromStructMapField<F>
  : F extends Field
  ? InferFromStructNormalField<F>
  : never

export type InferFromStructSchema<S extends StructSchema> = {
  [k in keyof S]: InferFromStructField<S[k]>
}

export type Infer<T extends PTBMessage<any>> = T extends PTBMessage<infer S> ? InferFromStructSchema<S> : never
