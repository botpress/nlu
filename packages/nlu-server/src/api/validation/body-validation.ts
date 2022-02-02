import {
  IntentDefinition,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition,
  http
} from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import { validate } from 'joi'
import { InvalidRequestFormatError, InvalidTrainSetError } from '../errors'

import { PredictInputSchema, TrainInputSchema, DetectLangInputSchema } from './schemas'

const SLOT_ANY = 'any'

const makeSlotChecker = (listEntities: ListEntityDefinition[], patternEntities: PatternEntityDefinition[]) => (
  variable: SlotDefinition
) => {
  const { entities, name } = variable

  const supportedTypes = [
    ...listEntities.map((e) => e.name),
    ...patternEntities.map((p) => p.name),
    ...NLUEngine.SYSTEM_ENTITIES,
    SLOT_ANY
  ]
  for (const entity of entities) {
    if (!supportedTypes.includes(entity)) {
      throw new InvalidTrainSetError(`Slot ${name} references entity ${entity}, but it does not exist.`)
    }
  }
}

const makeIntentChecker = (contexts: string[]) => (
  intent: IntentDefinition,
  enums: ListEntityDefinition[],
  patterns: PatternEntityDefinition[]
) => {
  for (const ctx of intent.contexts) {
    if (!contexts.includes(ctx)) {
      throw new InvalidTrainSetError(`Context ${ctx} of Intent ${intent.name} does not seem to appear in all contexts`)
    }
  }
  const variableChecker = makeSlotChecker(enums, patterns)
  intent.slots.forEach(variableChecker)
}

const isListEntity = (e: ListEntityDefinition | PatternEntityDefinition): e is ListEntityDefinition => {
  return e.type === 'list'
}

const isPatternEntity = (e: ListEntityDefinition | PatternEntityDefinition): e is PatternEntityDefinition => {
  return e.type === 'pattern'
}

export async function validateTrainInput(rawInput: any): Promise<http.TrainRequestBody> {
  let validatedInput: http.TrainRequestBody

  try {
    validatedInput = await validate(rawInput, TrainInputSchema, {})
  } catch (thrown) {
    if (thrown instanceof Error) {
      throw new InvalidRequestFormatError(thrown.message)
    }
    throw new InvalidRequestFormatError('invalid train format')
  }

  const { entities, contexts } = validatedInput
  const listEntities = entities.filter(isListEntity)
  const patternEntities = entities.filter(isPatternEntity)

  const validateIntent = makeIntentChecker(contexts)

  for (const intent of validatedInput.intents) {
    validateIntent(intent, listEntities, patternEntities)
  }

  return validatedInput
}

export async function validatePredictInput(rawInput: any): Promise<http.PredictRequestBody> {
  try {
    const validated: http.PredictRequestBody = await validate(rawInput, PredictInputSchema, {})
    return validated
  } catch (thrown) {
    if (thrown instanceof Error) {
      throw new InvalidRequestFormatError(thrown.message)
    }
    throw new InvalidRequestFormatError('invalid predict format')
  }
}

export async function validateDetectLangInput(rawInput: any): Promise<http.DetectLangRequestBody> {
  try {
    const validated: http.DetectLangRequestBody = await validate(rawInput, DetectLangInputSchema, {})
    return validated
  } catch (thrown) {
    if (thrown instanceof Error) {
      throw new InvalidRequestFormatError(thrown.message)
    }
    throw new InvalidRequestFormatError('invalid detect language format')
  }
}
