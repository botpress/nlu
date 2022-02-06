import { StructSchema } from './typings'

export const asPTB = <S extends StructSchema>(s: S): S => {
  return s
}

export * from './typings'
export { PTBMessage } from './ptb-struct'
export { Infer } from './inference'
