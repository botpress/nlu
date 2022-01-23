import Bluebird from 'bluebird'
import _ from 'lodash'
import { SLOT_ANY } from '../../constants'
import { isListEntity, isPatternEntity } from '../../guards'
import { DatasetIssue, IssueData, IssueDefinition } from '../../linting'
import {
  EntityDefinition,
  IntentDefinition,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition,
  TrainInput
} from '../../typings'
import { CustomEntityExtractor } from '../entities/custom-extractor'
import { makeListEntityModel } from '../entities/list-entity-model'
import { replaceConsecutiveSpaces } from '../tools/strings'
import { EntityExtractionResult, ListEntity, ListEntityModel, PatternEntity, Tools } from '../typings'
import Utterance, { buildUtteranceBatch, UtteranceSlot } from '../utterance/utterance'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const code = asCode('E_000')

export const E_000: IssueDefinition<typeof code> = {
  code,
  severity: 'error',
  name: 'tokens_tagged_with_slot_has_incorrect_type'
}

const makeListEntityMapper = (lang: string, tools: Tools) => (list: ListEntityDefinition): Promise<ListEntityModel> => {
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

const splitEntities = (entitieDefs: EntityDefinition[]) => {
  const listEntities = entitieDefs.filter(isListEntity)
  const patternEntities = entitieDefs.filter(isPatternEntity)
  return {
    listEntities,
    patternEntities
  }
}

const entityMatchesSlot = (slot: UtteranceSlot, slotDef: SlotDefinition) => (entity: EntityExtractionResult) =>
  entity.start === slot.startPos && entity.end === slot.endPos && slotDef.entities.includes(entity.type)

const makeSlotValidator = (
  utterance: Utterance,
  intent: IntentDefinition,
  entities: EntityDefinition[],
  lang: string,
  tools: Tools
) => async (slot: UtteranceSlot): Promise<DatasetIssue<typeof code>[]> => {
  const slotDef = intent.slots.find(({ name }) => name === slot.name)
  if (!slotDef) {
    return []
  }
  if (slotDef.entities.includes(SLOT_ANY)) {
    return []
  }

  const { listEntities, patternEntities } = splitEntities(entities)

  const { systemEntityExtractor } = tools
  const customEntityExtractor = new CustomEntityExtractor()

  const mapListEntities = makeListEntityMapper(lang, tools)
  const listModels = await Bluebird.map(listEntities, mapListEntities)
  const extractedLists = customEntityExtractor.extractListEntities(utterance, listModels)

  const patternModels = patternEntities.map(mapPatternEntity)
  const extractedPatterns = customEntityExtractor.extractPatternEntities(utterance, patternModels)

  const extractedCustom = [...extractedLists, ...extractedPatterns]
  const extractedSystem = await systemEntityExtractor.extract(utterance.toString(), lang)

  const customMatch = extractedCustom.some(entityMatchesSlot(slot, slotDef))
  const systemMatch = extractedSystem.some(entityMatchesSlot(slot, slotDef))

  if (customMatch || systemMatch) {
    return []
  }

  const data: IssueData<typeof code> = {
    intent: intent.name,
    slot: slotDef.name,
    utterance: utterance.toString(),
    entities: slotDef.entities,
    source: slot.value
  }

  return [
    {
      ...E_000,
      id: computeId(code, data),
      message: `Tokens "${slot.value}" tagged with slot "${slot.name}" do not match expected entities.`,
      data
    }
  ]
}

const makeUtteranceValidator = (
  intent: IntentDefinition,
  entities: EntityDefinition[],
  lang: string,
  tools: Tools
) => async (utterance: Utterance): Promise<DatasetIssue<typeof code>[]> => {
  const validateSlot = makeSlotValidator(utterance, intent, entities, lang, tools)

  let issues: DatasetIssue<typeof code>[] = []
  for (const s of utterance.slots) {
    const slotIssues = await validateSlot(s)
    issues = [...issues, ...slotIssues]
  }
  return issues
}

const makeIntentValidator = (entities: EntityDefinition[], lang: string, tools: Tools) => async (
  intent: IntentDefinition
): Promise<DatasetIssue<typeof code>[]> => {
  const validateUtterance = makeUtteranceValidator(intent, entities, lang, tools)

  const cleaned = intent.utterances.map(_.flow([_.trim, replaceConsecutiveSpaces]))
  const utterances = await buildUtteranceBatch(cleaned, lang, tools)

  let issues: DatasetIssue<typeof code>[] = []
  for (const u of utterances) {
    const utteranceIssues = await validateUtterance(u)
    issues = [...issues, ...utteranceIssues]
  }
  return issues
}

export const E_000_Linter: IssueLinter<typeof code> = {
  ...E_000,
  speed: 'fast',
  lint: async (ts: TrainInput, tools: Tools) => {
    const validateIntent = makeIntentValidator(ts.entities, ts.language, tools)

    let issues: DatasetIssue<typeof code>[] = []
    for (const i of ts.intents) {
      const intentIssues = await validateIntent(i)
      issues = [...issues, ...intentIssues]
    }
    return issues
  }
}
