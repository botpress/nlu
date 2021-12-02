import { getBinding } from './initialize'
import { NSVM } from './typings'

type SvmCtor = new (args?: { random_seed: number }) => NSVM
type HelloWorld = () => string
type BindingType = {
  NSVM: SvmCtor
  hello: HelloWorld
}

export const makeSvm = async (args?: { random_seed: number }) => {
  const binding = await getBinding<BindingType>()
  return new binding.NSVM(args)
}
