import { init } from './initialize'
import { Tagger, Trainer, TrainerOptions } from './typings'

type TaggerCtor = new () => Tagger
type TrainerCtor = new (opt?: TrainerOptions) => Trainer

interface BindingType {
  Tagger: TaggerCtor
  Trainer: TrainerCtor
}

let binding: BindingType | undefined
export const makeTrainer = async (args?: TrainerOptions) => {
  if (binding) {
    return new binding.Trainer(args)
  }
  binding = await init<BindingType>()
  return new binding.Trainer(args)
}

export const makeTagger = async () => {
  if (binding) {
    return new binding.Tagger()
  }
  binding = await init<BindingType>()
  return new binding.Tagger()
}
