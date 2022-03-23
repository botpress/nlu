import ptb from 'protobufjs'
import { PTBMessage } from './ptb-struct'

type Dic<T> = { [key: string]: T }
type Override<T, K> = Omit<T, keyof K> & K

/**
 * ####################
 * ### base typings ###
 * ####################
 */

export type FieldRule = 'required' | 'optional' | 'repeated'

export type NumberFieldType =
  | 'double'
  | 'float'
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'sint32'
  | 'sint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'

export type FieldType = 'bool' | 'string' | 'bytes' | NumberFieldType

export type BasicField = Override<ptb.IField, { type: FieldType; rule: FieldRule }>
export type Field = Override<BasicField, { type: FieldType | PTBMessage<any> }>

export type BasicMapField = { type: FieldType; id: number; keyType: NumberFieldType | 'string' }
export type MapField = Override<BasicMapField, { type: FieldType | PTBMessage<any> }>

export type BasicStructSchema = Dic<BasicField | BasicMapField>
export type StructSchema = Dic<Field | MapField>
