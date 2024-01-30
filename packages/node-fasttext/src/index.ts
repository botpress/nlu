import { getBinding } from './initialize'
import { Classifier, Query } from './typings'

type ClassifierCtor = new (modelFilename?: string) => Classifier
type QueryCtor = new (modelFilename: string) => Query

type BindingType = {
  Classifier: ClassifierCtor
  Query: QueryCtor
}

export const makeClassifier = async (modelFilename?: string) => {
  const binding = await getBinding<BindingType>()
  return new binding.Classifier(modelFilename)
}

export const makeQuery = async (modelFilename: string) => {
  const binding = await getBinding<BindingType>()
  return new binding.Query(modelFilename)
}
