import * as ptb from '@botpress/ptb-schema'

export const PTBSlotDefinition = new ptb.PTBMessage('SlotDefinition', {
  name: { type: 'string', id: 1 },
  entities: { type: 'string', id: 2, rule: 'repeated' }
})

export const PTBIntentSlotFeatures = new ptb.PTBMessage('IntentSlotFeatures', {
  name: { type: 'string', id: 1 },
  vocab: { type: 'string', id: 2, rule: 'repeated' },
  slot_entities: { type: 'string', id: 3, rule: 'repeated' }
})

export const PTBSlotModel = new ptb.PTBMessage('SlotModel', {
  crfModel: { type: 'bytes', id: 1, rule: 'optional' },
  intentFeatures: { type: PTBIntentSlotFeatures, id: 2 },
  slot_definitions: { type: PTBSlotDefinition, id: 3, rule: 'repeated' }
})
