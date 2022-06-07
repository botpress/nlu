import Joi from 'joi'

const ListEntityOccurenceSchema = Joi.object({
  name: Joi.string().required(), // ex: 'Paris', 'Montreal', 'Québec'
  synonyms: Joi.array() // ex: 'La Ville des lumières', 'City of Paris'
    .items(Joi.string())
    .optional()
    .default([])
})

const ListEntitySchema = Joi.object().keys({
  name: Joi.string().required(), // ex: 'cities'
  values: Joi.array().items(ListEntityOccurenceSchema).required().min(1),
  fuzzy: Joi.number().default(0.9)
})

const PatternEntitySchema = Joi.object().keys({
  name: Joi.string().required(),
  regex: Joi.string().required(),
  case_sensitive: Joi.bool().default(true),
  examples: Joi.array().items(Joi.string()).optional().default([])
})

const EntitySchema = Joi.when('type', { is: 'list', then: ListEntitySchema }).when('type', {
  is: 'pattern',
  then: PatternEntitySchema
})

const SlotSchema = Joi.object().keys({
  name: Joi.string().required(),
  entities: Joi.array().items(Joi.string()).optional().default([])
})

const IntentSchema = Joi.object().keys({
  name: Joi.string().required(),
  contexts: Joi.array().items(Joi.string()).required().min(1),
  slots: Joi.array().items(SlotSchema).optional().default([]),
  utterances: Joi.array().items(Joi.string().allow('')).required().default([])
})

export const TrainInputSchema = Joi.object().keys({
  language: Joi.string().required(),
  intents: Joi.array().items(IntentSchema).required().min(0),
  contexts: Joi.array().items(Joi.string()).required().min(0),
  entities: Joi.array().items(EntitySchema).optional().default([]),
  seed: Joi.number().optional()
})

export const PredictInputSchema = Joi.object().keys({
  utterances: Joi.array().items(Joi.string()).required().min(1)
})

export const DetectLangInputSchema = Joi.object().keys({
  utterances: Joi.array().items(Joi.string()).required().min(1),
  models: Joi.array().items(Joi.string()).optional().default([])
})
