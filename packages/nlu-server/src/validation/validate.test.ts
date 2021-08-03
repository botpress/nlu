import { IntentDefinition, ListEntityDefinition, PatternEntityDefinition, SlotDefinition } from '@botpress/nlu-client'
import { http } from '@botpress/nlu-client'

import { validateTrainInput } from './validate'

/**
 * These unit tests don't cover all possible scenarios of training input, but they to more good than bad.
 * If we ever find a bug in train input validation, we'll just add some more tests.
 */

const CITY_ENUM: ListEntityDefinition = {
  name: 'city',
  type: 'list',
  fuzzy: 1,
  values: [
    { name: 'paris', synonyms: ['city of paris', 'la ville des lumières'] },
    { name: 'quebec', synonyms: [] }
  ]
}

const TICKET_PATTERN: PatternEntityDefinition = {
  name: 'ticket',
  type: 'pattern',
  case_sensitive: true,
  regex: '[A-Z]{3}-[0-9]{3}', // ABC-123
  examples: ['ABC-123']
}

const VARIABLE_CITY_FROM: SlotDefinition = { name: 'city-from', entities: ['city'] }

const VARIABLE_TICKET_PROBLEM: SlotDefinition = { name: 'tick-with-problem', entities: ['ticket'] }

const FLY_INTENT: IntentDefinition = {
  name: 'fly',
  contexts: ['fly'],
  utterances: ['fly from $city-from to anywhere', 'book a flight'],
  slots: [VARIABLE_CITY_FROM]
}

const PROBLEM_INTENT: IntentDefinition = {
  name: 'problem',
  contexts: ['problem'],
  utterances: ['problem with ticket $tick-with-problem', 'problem with ticket'],
  slots: [VARIABLE_TICKET_PROBLEM]
}

const EMPTY_INTENT: IntentDefinition = {
  name: 'empty',
  contexts: ['empty'],
  utterances: ['hahahahahahaha'],
  slots: []
}

const BOUILLON_INTENT: IntentDefinition = {
  name: 'bouillon',
  contexts: [''],
  utterances: ['I vote for [subway](restaurant-to-vote)'],
  slots: [{ name: 'restaurant-to-vote', entities: ['restaurant'] }]
}

const LANG = 'en'
const PW = 'Caput Draconis'
const APP_ID = 'Spero_patronum'

test('validate with correct format should pass', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [FLY_INTENT],
    entities: [CITY_ENUM],
    contexts: ['fly'],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act
  const validated = await validateTrainInput(trainInput)

  // assert
  expect(validated).toStrictEqual(trainInput)
})

test('validate without pw should set pw as empty string', async () => {
  // arrange
  const trainInput: Partial<http.TrainRequestBody> = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42
  }

  // act
  const validated = await validateTrainInput(trainInput)

  // assert
  expect(validated.appSecret).toBe('')
})

test('validate with empty string pw should be allowed', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42,
    appSecret: '',
    appId: ''
  }

  // act
  const validated = await validateTrainInput(trainInput)

  // assert
  expect(validated.appSecret).toBe('')
})

test('validate input without enums and patterns should pass', async () => {
  // arrange
  const trainInput: Omit<http.TrainRequestBody, 'entities'> = {
    intents: [EMPTY_INTENT],
    contexts: ['empty'],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act
  const validated = await validateTrainInput(trainInput)

  // assert
  const expected: http.TrainRequestBody = { ...trainInput, entities: [] }
  expect(validated).toStrictEqual(expected)
})

test('validate input without topics or language should throw', async () => {
  // arrange
  const withoutContexts: Omit<http.TrainRequestBody, 'entities' | 'contexts' | 'intents'> = {
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  const withoutLang: Omit<http.TrainRequestBody, 'entities' | 'language'> = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(withoutContexts)).rejects.toThrow()
  await expect(validateTrainInput(withoutLang)).rejects.toThrow()
})

test('validate without intent should fail', async () => {
  // arrange
  const withoutUtterances: IntentDefinition = { name: 'will break', contexts: ['A'] } as IntentDefinition

  const trainInput: http.TrainRequestBody = {
    intents: [withoutUtterances],
    contexts: ['A'],
    entities: [CITY_ENUM],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate intent with unexisting context should fail', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [FLY_INTENT],
    contexts: ['A'],
    entities: [CITY_ENUM],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate enum without values or patterns without regexes should fail', async () => {
  // arrange
  const incompleteEnum: ListEntityDefinition = { name: 'city' } as ListEntityDefinition

  const incompletePattern: PatternEntityDefinition = { name: 'password' } as PatternEntityDefinition

  const withoutValues: http.TrainRequestBody = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [incompleteEnum],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  const withoutRegexes: http.TrainRequestBody = {
    intents: [PROBLEM_INTENT],
    contexts: ['problem'],
    entities: [incompletePattern],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(withoutValues)).rejects.toThrow()
  await expect(validateTrainInput(withoutRegexes)).rejects.toThrow()
})

test('validate with an unexisting referenced enum should throw', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [TICKET_PATTERN],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate with an unexisting referenced pattern should throw', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [PROBLEM_INTENT],
    contexts: ['problem'],
    entities: [CITY_ENUM],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate with an unexisting referenced complex should throw', async () => {
  // arrange
  const trainInput: http.TrainRequestBody = {
    intents: [BOUILLON_INTENT],
    contexts: ['bouillon'],
    entities: [CITY_ENUM],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate with correct format but unexpected property should fail', async () => {
  // arrange
  const trainInput: http.TrainRequestBody & { enums: any[] } = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [CITY_ENUM],
    language: LANG,
    appSecret: PW,
    appId: APP_ID,
    enums: [],
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})
