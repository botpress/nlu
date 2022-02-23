import Bluebird from 'bluebird'
import _ from 'lodash'
import { SLOT_ANY, SYSTEM_ENTITIES } from '../../constants'
import { isListEntity, isPatternEntity } from '../../guards'
import { DatasetIssue, IssueData, IssueDefinition } from '../../linting'
import {
  EntityDefinition,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition,
  TrainInput
} from '../../typings'
import { CustomEntityExtractor } from '../entities/custom-extractor'
import { makeListEntityModel } from '../entities/list-entity-model'
import { replaceConsecutiveSpaces } from '../tools/strings'
import { ListEntity, ListEntityModel, PatternEntity, Tools } from '../typings'
import Utterance, { buildUtteranceBatch, UtteranceSlot } from '../utterance/utterance'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const code = asCode('E_000')

export const E_000: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'tokens_tagged_with_slot_has_incorrect_type'
}

const makeIssueFromData = (data: IssueData<typeof code>): DatasetIssue<typeof code> => ({
  ...E_000,
  id: computeId(code, data),
  message: `Tokens "${data.source}" tagged with slot "${data.slot}" do not match expected entities.`,
  data
})

type ResolvedSlotDef = {
  name: string
  isAny: boolean
  listEntities: ListEntityModel[]
  patternEntities: PatternEntity[]
  systemEntities: string[]
}

type VerificationUnit = {
  intent: string
  rawUtterance: string
  utterance: Utterance
  slotDef: ResolvedSlotDef
  slot: UtteranceSlot
}

const splitEntities = (entitieDefs: EntityDefinition[]) => {
  const listEntities = entitieDefs.filter(isListEntity)
  const patternEntities = entitieDefs.filter(isPatternEntity)
  return {
    listEntities,
    patternEntities
  }
}

const truncateZip = <A, B>(pair: [A | undefined, B | undefined]): pair is [A, B] => {
  return pair[0] !== undefined && pair[1] !== undefined
}

const isDefined = <T>(x: T | undefined): x is T => {
  return x !== undefined
}

type Unpack<P> = P extends Promise<infer X> ? X : P

const mapListEntity = (lang: string, tools: Tools, list: ListEntityDefinition): Promise<ListEntityModel> => {
  const { name, values, fuzzy, sensitive } = list

  const synonyms = _(values)
    .map(({ name, synonyms }) => <[string, string[]]>[name, synonyms])
    .fromPairs()
    .value()

  const mapped: ListEntity = {
    name,
    fuzzyTolerance: fuzzy,
    sensitive: !!sensitive,
    synonyms
  }

  return makeListEntityModel(mapped, lang, tools)
}

const mapPatternEntity = (pattern: PatternEntityDefinition): PatternEntity => {
  const { name, regex, case_sensitive, examples, sensitive } = pattern
  return {
    name,
    examples,
    matchCase: case_sensitive,
    pattern: regex,
    sensitive: !!sensitive
  }
}

const mapSlotDef = (
  listModels: ListEntityModel[],
  patternModels: PatternEntity[],
  { name, entities }: SlotDefinition
): ResolvedSlotDef => {
  return {
    name,
    isAny: entities.includes(SLOT_ANY),
    listEntities: entities.map((e) => listModels.find((lm) => lm.entityName === e)).filter(isDefined),
    patternEntities: entities.map((e) => patternModels.find((pm) => pm.name === e)).filter(isDefined),
    systemEntities: entities.map((e) => SYSTEM_ENTITIES.find((s) => s === e)).filter(isDefined)
  }
}

const resolveEntities = async (ts: TrainInput, tools: Tools) => {
  const { intents, entities, language, seed } = ts
  const { listEntities, patternEntities } = splitEntities(entities)

  const listModels = await Bluebird.map(listEntities, (e) => mapListEntity(language, tools, e))
  const patternModels = patternEntities.map(mapPatternEntity)

  const resolvedIntents = intents.map(({ slots, ...i }) => ({
    ...i,
    slots: slots.map((s) => mapSlotDef(listModels, patternModels, s))
  }))

  return {
    entities,
    language,
    seed,
    intents: resolvedIntents
  }
}

// TODO: ensure we only get combinations with slot that is tagged as slotDef
const flattenDataset = async (
  ts: Unpack<ReturnType<typeof resolveEntities>>,
  tools: Tools
): Promise<VerificationUnit[]> => {
  const flatIntents = ts.intents
  const flatRawUtterances = _.flatMap(flatIntents, ({ utterances, ...x }) =>
    utterances.map((u) => ({ rawUtterance: u, intent: x }))
  )

  const rawUtterances: string[] = flatRawUtterances
    .map(({ rawUtterance }) => rawUtterance)
    .map(_.flow([_.trim, replaceConsecutiveSpaces]))
  const utteranceBatch = await buildUtteranceBatch(rawUtterances, ts.language, tools)

  const flatUtterances = _.zip(flatRawUtterances, utteranceBatch)
    .filter(truncateZip)
    .map(([x, u]) => ({ ...x, utterance: u }))

  const flatSlotDefinitions = _.flatMap(flatUtterances, ({ intent, ...x }) =>
    intent.slots.map((s) => ({ intent: intent.name, slotDef: s, ...x }))
  )

  const flatSlotOccurences = _.flatMap(flatSlotDefinitions, ({ utterance, ...x }) =>
    utterance.slots.map((s) => ({ slot: s, utterance, ...x }))
  )

  return flatSlotOccurences
}

const matchesCustom = (customEntityExtractor: CustomEntityExtractor) => (unit: VerificationUnit) => {
  const { startTokenIdx, endTokenIdx } = unit.slot
  const slotTokens = unit.utterance.tokens.filter(({ index }) => index >= startTokenIdx && index <= endTokenIdx)

  const listMatches = customEntityExtractor.extractListEntities({ tokens: slotTokens }, unit.slotDef.listEntities)
  if (listMatches.length) {
    return true
  }

  const patternMatches = customEntityExtractor.extractPatternEntities(
    { tokens: slotTokens },
    unit.slotDef.patternEntities
  )
  if (patternMatches.length) {
    return true
  }

  return false
}

export const E_000_Linter: IssueLinter<typeof code> = {
  ...E_000,
  speed: 'fastest',
  lint: async (ts: TrainInput, tools: Tools) => {
    const resolvedSet = await resolveEntities(ts, tools)
    const flatDataset = await flattenDataset(resolvedSet, tools)

    const { systemEntityExtractor } = tools
    const customEntityExtractor = new CustomEntityExtractor()

    let potentiallyInvalidSlots = flatDataset
    potentiallyInvalidSlots = _.reject(flatDataset, (u) => u.slotDef.isAny)
    potentiallyInvalidSlots = _.reject(flatDataset, matchesCustom(customEntityExtractor))

    const [withSystemEntities, withoutSystemEntities] = _.partition(
      potentiallyInvalidSlots,
      (s) => s.slotDef.systemEntities.length
    )

    const extractedSystemEntities = await systemEntityExtractor.extractMultiple(
      withSystemEntities.map((u) => u.utterance.toString()), // use whole utterance here as duckling might be influenced by token postion in utterances and is fast anyway
      ts.language,
      () => {},
      true
    )

    // withoutSystemEntities are invalid since they are not "any", they don't match custom and have no system entities
    // use extracted system entities to know which of the remaining slots are valid or not

    return []
  }
}
