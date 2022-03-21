import { IntentDefinition, http, IssueComputationSpeed } from '@botpress/nlu-client'
import { ObjectSchema, validate } from 'joi'
import _ from 'lodash'
import { InvalidRequestFormatError, InvalidTrainSetError } from '../errors'

import {
  PredictInputSchema,
  TrainInputSchema,
  DetectLangInputSchema,
  LintInputSchema,
  UploadModelSchema
} from './schemas'

const validateIntent = (contexts: string[], intent: IntentDefinition) => {
  for (const ctx of intent.contexts) {
    if (!contexts.includes(ctx)) {
      throw new InvalidTrainSetError(`Context ${ctx} of Intent ${intent.name} does not seem to appear in all contexts`)
    }
  }
}

async function _validateTrainset<T extends http.TrainRequestBody | http.LintRequestBody>(
  rawInput: any,
  schema: ObjectSchema
) {
  let validatedInput: T
  try {
    validatedInput = await validate(rawInput, schema, {})
  } catch (thrown) {
    if (thrown instanceof Error) {
      throw new InvalidRequestFormatError(thrown.message)
    }
    throw new InvalidRequestFormatError('invalid training/linting format')
  }

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
  const validated = await _validateTrainset<http.LintRequestBody>(rawInput, LintInputSchema)
  if (!isLintingSpeed(validated.speed)) {
    throw new InvalidRequestFormatError(`path param "${validated.speed}" is not a valid linting speed.`)
  }
  return validated
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

export async function validateUploadModelSchema(rawInput: any): Promise<http.UploadModelRequestBody> {
  try {
    const validated: http.UploadModelRequestBody = await validate(rawInput, UploadModelSchema, {})
    return validated
  } catch (thrown) {
    if (thrown instanceof Error) {
      throw new InvalidRequestFormatError(thrown.message)
    }
    throw new InvalidRequestFormatError('invalid upload model request format')
  }
}

export function isLintingSpeed(s: string): s is IssueComputationSpeed {
  const allSpeeds: { [s in IssueComputationSpeed]: s } = {
    fastest: 'fastest',
    fast: 'fast',
    slow: 'slow',
    slowest: 'slowest'
  }
  return Object.keys(allSpeeds).includes(s)
}
