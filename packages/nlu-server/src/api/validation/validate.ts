import { IntentDefinition, http } from '@botpress/nlu-client'
import { ObjectSchema, validate } from 'joi'
import { Join } from 'knex'

import { PredictInputSchema, TrainInputSchema, DetectLangInputSchema, LintInputSchema } from './schemas'

const validateIntent = (contexts: string[], intent: IntentDefinition) => {
  for (const ctx of intent.contexts) {
    if (!contexts.includes(ctx)) {
      throw new Error(`Context ${ctx} of Intent ${intent.name} does not seem to appear in all contexts`)
    }
  }
}

async function _validateTrainset<T extends http.TrainRequestBody | http.LintRequestBody>(
  rawInput: any,
  schema: ObjectSchema
) {
  const validatedInput: T = await validate(rawInput, schema, {})

  const { contexts } = validatedInput

  for (const intent of validatedInput.intents) {
    validateIntent(contexts, intent)
  }

  return validatedInput
}

export async function validateTrainInput(rawInput: any): Promise<http.TrainRequestBody> {
  return _validateTrainset<http.TrainRequestBody>(rawInput, TrainInputSchema)
}

export async function validateLintInput(rawInput: any): Promise<http.LintRequestBody> {
  return _validateTrainset<http.LintRequestBody>(rawInput, LintInputSchema)
}

export async function validatePredictInput(rawInput: any): Promise<http.PredictRequestBody> {
  const validated: http.PredictRequestBody = await validate(rawInput, PredictInputSchema, {})
  return validated
}

export async function validateDetectLangInput(rawInput: any): Promise<http.DetectLangRequestBody> {
  const validated: http.DetectLangRequestBody = await validate(rawInput, DetectLangInputSchema, {})
  return validated
}
