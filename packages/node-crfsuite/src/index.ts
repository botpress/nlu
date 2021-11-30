import { getBinding } from './initialize'
import { Tagger, Trainer, TrainerOptions } from './typings'

type TaggerCtor = new () => Tagger
type TrainerCtor = new (opt?: TrainerOptions) => Trainer

interface BindingType {
  Tagger: TaggerCtor
  Trainer: TrainerCtor
}

export const makeTrainer = async (args?: TrainerOptions) => {
  const binding = await getBinding<BindingType>()
  return new binding.Trainer(args)
}

export const makeTagger = async () => {
  const binding = await getBinding<BindingType>()
  return new binding.Tagger()
}
