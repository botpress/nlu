import { init } from './initialize'
import { NSVM } from './typings'

type SvmCtor = new (args?: { random_seed: number }) => NSVM
type HelloWorld = () => string
interface BindingType {
  NSVM: SvmCtor
  hello: HelloWorld
}

let binding: BindingType | undefined
export const makeSvm = async (args?: { random_seed: number }) => {
  if (binding) {
    return new binding.NSVM(args)
  }
  binding = await init<BindingType>()
  return new binding.NSVM(args)
}
