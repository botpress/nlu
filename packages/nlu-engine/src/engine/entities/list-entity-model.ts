import _ from 'lodash'
import { convertToRealSpaces } from '../tools/token-utils'
import { ListEntity, ListEntityModel, Tools } from '../typings'

export async function makeListEntityModel(entity: ListEntity, languageCode: string, tools: Tools) {
  const allValues = _.uniq(Object.keys(entity.synonyms).concat(..._.values(entity.synonyms))).map((t) => t.trim())
  const allTokens = (await tools.tokenize_utterances(allValues, languageCode)).map((toks) =>
    toks.map(convertToRealSpaces)
  )

  const mappingsTokens = _.mapValues(entity.synonyms, (synonyms, name) =>
    [...synonyms, name].map((syn) => {
      const idx = allValues.indexOf(syn)
      return allTokens[idx]
    })
  )

  const model: ListEntityModel = {
    type: 'custom.list',
    id: `custom.list.${entity.name}`,
    entityName: entity.name,
    fuzzyTolerance: entity.fuzzyTolerance,
    sensitive: entity.sensitive,
    mappingsTokens
  }

  return model
}
