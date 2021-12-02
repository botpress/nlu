import { getBinding } from './initialize'
import { Processor } from './typings'

type TaggerCtor = new () => Processor

type BindingType = {
  Processor: TaggerCtor
}

export const makeProcessor = async () => {
  const binding = await getBinding<BindingType>()
  return new binding.Processor()
}
