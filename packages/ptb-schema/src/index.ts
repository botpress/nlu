import { PTBMessage } from './ptb-struct'
import { InferFromStructSchema, StructSchema } from './typings'

export const asPTB = <S extends StructSchema>(s: S): S => {
  return s
}

export { PTBMessage } from './ptb-struct'

export type Infer<T extends PTBMessage<any>> = T extends PTBMessage<infer S> ? InferFromStructSchema<S> : never
