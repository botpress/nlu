import ptb from 'protobufjs'
import { PTBMessage } from './ptb-struct'

type Dic<T> = { [key: string]: T }
type Override<T, K> = Omit<T, keyof K> & K

/**
 * ####################
 * ### base typings ###
 * ####################
 */

export type Rule = 'required' | 'optional' | 'repeated'

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

export type BasicField = Override<ptb.IField, { type: FieldType; rule?: Rule }>
export type Field = Override<ptb.IField, { type: FieldType | PTBMessage<any>; rule?: Rule }>

export type FlatStructSchema = Dic<BasicField>
export type StructSchema = Dic<Field>
