import _ from 'lodash'
import { BIO, SlotExtractionResult, SlotDefinition, Tag } from '../typings'
import Utterance from '../utterance/utterance'

export type TagResult = {
  tag: Tag | string
  name: string
  probability: number
}

const MIN_SLOT_CONFIDENCE = 0.15

export function labelizeUtterance(utterance: Utterance): string[] {
  return utterance.tokens
    .filter((x) => !x.isSpace)
    .map((token) => {
      if (_.isEmpty(token.slots)) {
        return BIO.OUT
      }

      const slot = token.slots[0]
      const tag = slot.startTokenIdx === token.index ? BIO.BEGINNING : BIO.INSIDE
      const any = _.isEmpty(token.entities) ? '/any' : ''

      return `${tag}-${slot.name}${any}`
    })
}

export function predictionLabelToTagResult(prediction: { [label: string]: number }): TagResult {
  const pairedPreds = _.chain(prediction)
    .mapValues((value, key) => value + (prediction[`${key}/any`] || 0))
    .toPairs()
    .value()

  if (!pairedPreds.length) {
    throw new Error('there should be at least one prediction when converting predictions to tag result')
  }
  const [label, probability] = _.maxBy(pairedPreds, (x) => x[1])!

  return {
    tag: label[0],
    name: label.slice(2).replace('/any', ''),
    probability
  } as TagResult
}

export function removeInvalidTagsForIntent(slot_definitions: SlotDefinition[], tag: TagResult): TagResult {
  if (tag.tag === BIO.OUT) {
    return tag
  }

  const foundInSlotDef = !!slot_definitions.find((s) => s.name === tag.name)

  if (tag.probability < MIN_SLOT_CONFIDENCE || !foundInSlotDef) {
    tag = {
      tag: BIO.OUT,
      name: '',
      probability: 1 - tag.probability // anything would do here
    }
  }

  return tag
}

export function makeExtractedSlots(
  slot_entities: string[],
  utterance: Utterance,
  slotTagResults: TagResult[]
): SlotExtractionResult[] {
  return _.zipWith(
    utterance.tokens.filter((t) => !t.isSpace),
    slotTagResults,
    (token, tagRes) => ({ token, tagRes })
  )
    .filter(({ tagRes }) => tagRes.tag !== BIO.OUT)
    .reduce((combined, { token, tagRes }) => {
      const last = _.last(combined)
      const shouldConcatWithPrev = tagRes.tag === BIO.INSIDE && _.get(last, 'slot.name') === tagRes.name

      if (shouldConcatWithPrev && last) {
        const newEnd = token.offset + token.value.length
        const newSource = utterance.toString({ strategy: 'keep-token' }).slice(last.start, newEnd) // we use slice in case tokens are space split
        last.slot.source = newSource
        last.slot.value = newSource
        last.end = newEnd

        return [...combined.slice(0, -1), last]
      } else {
        return [
          ...combined,
          {
            slot: {
              name: tagRes.name,
              confidence: tagRes.probability,
              source: token.toString(),
              value: token.toString()
            },
            start: token.offset,
            end: token.offset + token.value.length
          }
        ]
      }
    }, [] as SlotExtractionResult[])
    .map((extracted: SlotExtractionResult) => {
      const associatedEntityInRange = utterance.entities.find(
        (e) =>
          ((e.startPos <= extracted.start && e.endPos >= extracted.end) || // slot is fully contained by an entity
            (e.startPos >= extracted.start && e.endPos <= extracted.end)) && // entity is fully within the tagged slot
          _.includes(slot_entities, e.type) // entity is part of the possible entities
      )
      if (associatedEntityInRange) {
        const { startPos, endPos, startTokenIdx, endTokenIdx, ...x } = associatedEntityInRange
        extracted.slot.entity = {
          ...x,
          start: startPos,
          end: endPos
        }
        extracted.slot.value = associatedEntityInRange.value
      }
      return extracted
    })
}
