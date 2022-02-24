import {
  IntentDefinition,
  ListEntityDefinition,
  Logger,
  PatternEntityDefinition,
  SlotDefinition,
  TrainInput
} from 'src/typings'
import { makeFakeTools } from '../test-utils/fake-tools'
import { lintingPipeline } from './linting-pipeline'

const dummyLogger: Partial<Logger> = { debug: () => {} }

const validateTrainInput = async (ts: TrainInput) => {
  const tools = makeFakeTools(100, ['en'])
  const issues = await lintingPipeline(
    ts,
    { ...tools, logger: dummyLogger as Logger },
    {
      minSpeed: 'fastest'
    }
  )

  if (issues.length) {
    const formatted = issues.map((i) => i.message).join('\n')
    throw new Error(formatted)
  }
}

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

test('validate with correct format should pass', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [FLY_INTENT],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42
  }

  // act && assert
  await validateTrainInput(trainInput)
})

test('validate intent wihtout utterances should fail', async () => {
  // arrange
  const withoutUtterances: IntentDefinition = { name: 'will break', contexts: ['A'] } as IntentDefinition

  const trainInput: TrainInput = {
    intents: [withoutUtterances],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate enum without values or patterns without regexes should fail', async () => {
  // arrange
  const incompleteEnum: ListEntityDefinition = { name: 'city' } as ListEntityDefinition

  const incompletePattern: PatternEntityDefinition = { name: 'password' } as PatternEntityDefinition

  const withoutValues: TrainInput = {
    intents: [FLY_INTENT],
    entities: [incompleteEnum],
    language: LANG,
    seed: 42
  }

  const withoutRegexes: TrainInput = {
    intents: [PROBLEM_INTENT],
    entities: [incompletePattern],
    language: LANG,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(withoutValues)).rejects.toThrow()
  await expect(validateTrainInput(withoutRegexes)).rejects.toThrow()
})

test('validate with an unexisting referenced enum should throw', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [FLY_INTENT],
    entities: [TICKET_PATTERN],
    language: LANG,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate with an unexisting referenced pattern should throw', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [PROBLEM_INTENT],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})

test('validate with an unexisting referenced complex should throw', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [BOUILLON_INTENT],
    entities: [CITY_ENUM],
    language: LANG,
    seed: 42
  }

  // act & assert
  await expect(validateTrainInput(trainInput)).rejects.toThrow()
})
