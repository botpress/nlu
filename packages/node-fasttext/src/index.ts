import { init } from './initialize'
import { Classifier, Query } from './typings'

type ClassifierCtor = new (modelFilename?: string) => Classifier
type QueryCtor = new (modelFilename: string) => Query

interface BindingType {
  Classifier: ClassifierCtor
  Query: QueryCtor
}

let binding: BindingType | undefined

export const makeClassifier = async (modelFilename?: string) => {
  if (binding) {
    return new binding.Classifier(modelFilename)
  }
  binding = await init<BindingType>()
  return new binding.Classifier(modelFilename)
}

export const makeQuery = async (modelFilename: string) => {
  if (binding) {
    return new binding.Query(modelFilename)
  }
  binding = await init<BindingType>()
  return new binding.Query(modelFilename)
}
