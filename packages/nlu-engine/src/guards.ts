import { PatternEntityDefinition, ListEntityDefinition } from 'src/typings'

export const isListEntity = (e: ListEntityDefinition | PatternEntityDefinition): e is ListEntityDefinition => {
  return e.type === 'list'
}

export const isPatternEntity = (e: ListEntityDefinition | PatternEntityDefinition): e is PatternEntityDefinition => {
  return e.type === 'pattern'
}
