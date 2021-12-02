import { Tag } from '../typings'

export type TagResult = {
  tag: Tag | string
  name: string
  probability: number
}

export type IntentSlotFeatures = {
  name: string
  vocab: string[]
  slot_entities: string[]
}
