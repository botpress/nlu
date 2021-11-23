import { init } from './initialize'
import { Processor } from './typings'

type TaggerCtor = new () => Processor

interface BindingType {
  Processor: TaggerCtor
}

let binding: BindingType | undefined
export const makeProcessor = async () => {
  if (binding) {
    return new binding.Processor()
  }
  binding = await init<BindingType>()
  return new binding.Processor()
}
