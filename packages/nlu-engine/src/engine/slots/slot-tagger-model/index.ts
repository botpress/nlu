import * as ptb from '@botpress/ptb-schema'
import { SlotDefinition } from '../../typings'
import { PTBSlotDefinition, PTBSlotModel } from './protobufs'

export type IntentSlotFeatures = {
  name: string
  vocab: string[]
  slot_entities: string[]
}

export type Model = {
  crfModel: Buffer | undefined
  intentFeatures: IntentSlotFeatures
  slot_definitions: SlotDefinition[]
}

export const serializeModel = (model: Model): Buffer => {
  return Buffer.from(PTBSlotModel.encode(model))
}

export const deserializeModel = (serialized: Buffer): Model => {
  const { crfModel, intentFeatures, slot_definitions } = PTBSlotModel.decode(Buffer.from(serialized))
  return {
    crfModel: crfModel && Buffer.from(crfModel),
    intentFeatures: {
      ...intentFeatures,
      vocab: intentFeatures.vocab ?? [],
      slot_entities: intentFeatures.slot_entities ?? []
    },
    slot_definitions: slot_definitions ? slot_definitions.map(deserializeSlotDef) : []
  }
}

const deserializeSlotDef = (encoded: ptb.Infer<typeof PTBSlotDefinition>): SlotDefinition => {
  const { entities, name } = encoded
  return {
    name,
    entities: entities ?? []
  }
}
