import { IntentDefinition, http } from '@botpress/nlu-client'
import { validate } from 'joi'

import { PredictInputSchema, TrainInputSchema, DetectLangInputSchema } from './schemas'

const validateIntent = (contexts: string[], intent: IntentDefinition) => {
  for (const ctx of intent.contexts) {
    if (!contexts.includes(ctx)) {
      throw new Error(`Context ${ctx} of Intent ${intent.name} does not seem to appear in all contexts`)
    }
  }
}

export async function validateTrainInput(rawInput: any): Promise<http.TrainRequestBody> {
  const validatedInput: http.TrainRequestBody = await validate(rawInput, TrainInputSchema, {})

  const { contexts } = validatedInput

  for (const intent of validatedInput.intents) {
    validateIntent(contexts, intent)
  }

  return validatedInput
}

export async function validatePredictInput(rawInput: any): Promise<http.PredictRequestBody> {
  const validated: http.PredictRequestBody = await validate(rawInput, PredictInputSchema, {})
  return validated
}

export async function validateDetectLangInput(rawInput: any): Promise<http.DetectLangRequestBody> {
  const validated: http.DetectLangRequestBody = await validate(rawInput, DetectLangInputSchema, {})
  return validated
}
