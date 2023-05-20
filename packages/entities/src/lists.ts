import _ from 'lodash'
import { ListEntityModel, extractForListModel } from './list-engine'
import { Tokenizer, spaceTokenizer } from './space-tokenizer'

export type ListEntityDefinitionValue = {
  name: string
  synonyms: string[]
}

export type ListEntityDefinition = {
  name: string
  fuzzy: number
  values: ListEntityDefinitionValue[]
}

export type ListEntityOutput = {
  name: string
  confidence: number
  value: string
  source: string
  charStart: number
  charEnd: number
}

export type ListEntityParserProps = { tokenizer: Tokenizer }

const DEFAULT_PROPS: ListEntityParserProps = {
  tokenizer: spaceTokenizer
}

const definitionToModel = (entity: ListEntityDefinition, tokenizer: Tokenizer): ListEntityModel => {
  let allValues = entity.values.map((v) => v.name)
  allValues = [...allValues, ...entity.values.flatMap((v) => v.synonyms)]
  allValues = _.uniq(allValues).map((t) => t.trim())

  const allTokens = allValues.map(tokenizer)

  const valueToTokens = ({ synonyms, name }: ListEntityDefinitionValue) =>
    [...synonyms, name].map((syn) => {
      const idx = allValues.indexOf(syn)
      return allTokens[idx]
    })

  const mappingsTokens = entity.values
    .map((v) => {
      const tokens = valueToTokens(v)
      return {
        key: v.name,
        tokens
      }
    })
    .reduce((acc, { key, tokens }) => ({ ...acc, [key]: tokens }), {})

  return {
    name: entity.name,
    fuzzy: entity.fuzzy,
    tokens: mappingsTokens
  }
}

export const extractListEntities = (
  utterance: string,
  definition: ListEntityDefinition,
  opt: Partial<ListEntityParserProps> = {}
) => {
  const props: ListEntityParserProps = { ...DEFAULT_PROPS, ...opt }

  const model = definitionToModel(definition, props.tokenizer)

  const tokens = props.tokenizer(utterance)

  return extractForListModel(tokens, model)
}
